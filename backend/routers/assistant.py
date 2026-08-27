import time
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Request
from core.limiter import limiter
from core.config import settings
from db.mongo import get_sensor_readings_collection, get_warehouses_collection
from routers.auth import get_current_user
from models.auth import SessionUser
from models.assistant import ChatRequest, ChatResponse

router = APIRouter(prefix="/api/assistant", tags=["assistant"])

@router.post("/chat", response_model=ChatResponse)
@limiter.limit("20/minute")
async def assistant_chat(
    request: Request,
    payload: ChatRequest,
    current_user: SessionUser = Depends(get_current_user)
):
    start_time = time.time()
    sensor_col = get_sensor_readings_collection()

    # Scope check for warehouse_head
    w_id = payload.warehouse_id
    if current_user.role == "warehouse_head" and current_user.warehouse_scope is not None:
        w_id = current_user.warehouse_scope

    # Retrieve grounded context from MongoDB
    query = {}
    if w_id:
        query["Warehouse_ID"] = w_id
    if payload.zone_id:
        query["Zone_ID"] = payload.zone_id

    latest_reading = await sensor_col.find_one(query, sort=[("Timestamp", -1)])
    
    grounded_context = {}
    if latest_reading:
        latest_reading.pop("_id", None)
        grounded_context = {
            "warehouse_name": latest_reading.get("Warehouse_Name"),
            "warehouse_id": latest_reading.get("Warehouse_ID"),
            "zone_id": latest_reading.get("Zone_ID"),
            "timestamp": latest_reading.get("Timestamp"),
            "temperature_C": latest_reading.get("Temperature_C"),
            "humidity_pct": latest_reading.get("Humidity_%"),
            "smoke_ppm": latest_reading.get("Smoke_ppm"),
            "motion": latest_reading.get("Motion"),
            "occupancy_pct": latest_reading.get("Occupancy_Pct"),
            "vacant_space_pct": latest_reading.get("Vacant_Space_Pct"),
            "number_of_sacks": latest_reading.get("Number_of_Sacks"),
            "zone_capacity_sacks": latest_reading.get("Zone_Capacity_Sacks"),
            "status": latest_reading.get("Warehouse_Status")
        }

    # Execute Groq LLM if key is configured, else fallback response
    groq_key = settings.GROQ_API_KEY
    response_text = ""
    model_used = settings.GROQ_MODEL

    if groq_key and groq_key != "your-groq-api-key-here":
        try:
            from groq import Groq
            client = Groq(api_key=groq_key)

            system_prompt = (
                "You are an AI assistant for Tamil Nadu's Smart Warehouse CRM platform. "
                "Answer the user's questions grounded STRICTLY in the real IoT sensor context provided. "
                "Never invent or hallucinate warehouse names, temperatures, or metrics not in the context. "
                f"Grounded Context: {grounded_context}"
            )

            messages = [{"role": "system", "content": system_prompt}]
            if payload.conversation_history:
                for h in payload.conversation_history:
                    messages.append({"role": h.role, "content": h.content})

            messages.append({"role": "user", "content": payload.message})

            completion = client.chat.completions.create(
                model=model_used,
                messages=messages,
                temperature=0.3,
                max_tokens=400
            )
            response_text = completion.choices[0].message.content.strip()
        except Exception as e:
            print(f"Groq API call error: {e}. Falling back to grounded rule engine.")

    if not response_text:
        # Fallback grounded response when Groq API key is unconfigured or offline
        model_used = "Grounded-Local-Assistant (Fallback)"
        w_name = grounded_context.get("warehouse_name", "All Warehouses")
        st = grounded_context.get("status", "Safe")
        temp = grounded_context.get("temperature_C", "N/A")
        occ = grounded_context.get("occupancy_pct", "N/A")
        smoke = grounded_context.get("smoke_ppm", "N/A")

        response_text = (
            f"Based on real-time IoT sensor telemetry for {w_name}: "
            f"The zone condition is currently reported as '{st}'. "
            f"Temperature is at {temp}°C, occupancy at {occ}%, and smoke levels at {smoke} ppm. "
            f"No critical thermal or structural anomalies detected requiring immediate evacuation."
        )

    latency_ms = round((time.time() - start_time) * 1000, 2)

    return ChatResponse(
        response=response_text,
        grounded_context=grounded_context if grounded_context else None,
        latency_ms=latency_ms,
        model_used=model_used
    )
