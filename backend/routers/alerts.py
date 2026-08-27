from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from db.mongo import get_alerts_collection, get_warehouses_collection
from routers.auth import get_current_user
from models.auth import SessionUser
from models.alert import AlertResponse, AcknowledgeRequest
from core.config import settings

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

async def generate_alert_narration(warehouse_name: str, zone_id: int, severity: str, details: dict) -> str:
    """Generate alert narration using Groq LLM if key is configured, else fallback template."""
    if settings.GROQ_API_KEY and settings.GROQ_API_KEY != "your-groq-api-key-here":
        try:
            from groq import Groq
            client = Groq(api_key=settings.GROQ_API_KEY)
            prompt = (
                f"Draft a concise 2-4 sentence urgent operational alert narration for a warehouse head.\n"
                f"Warehouse: {warehouse_name}, Zone: {zone_id}, Severity: {severity}\n"
                f"Sensor details: Temperature={details.get('Temperature_C')}C, Smoke={details.get('Smoke_ppm')}ppm, "
                f"Humidity={details.get('Humidity_%')}%, Occupancy={details.get('Occupancy_Pct')}%.\n"
                f"Explain the risk clearly and recommend immediate safety steps."
            )
            completion = client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=150
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            print(f"Groq API call failed: {e}. Using fallback narration.")

    # Fallback template narration when Groq API key is unconfigured or call fails
    temp = details.get("Temperature_C", "N/A")
    smoke = details.get("Smoke_ppm", "N/A")
    occ = details.get("Occupancy_Pct", "N/A")
    return (
        f"URGENT ALERT for {warehouse_name} (Zone {zone_id}): Sensor metrics indicate a '{severity}' condition. "
        f"Temperature recorded at {temp}°C, smoke level at {smoke} ppm, and occupancy at {occ}%. "
        f"Immediate inspection and safety verification are required for this zone."
    )

@router.get("", response_model=List[AlertResponse])
async def list_alerts(
    warehouse_id: Optional[int] = Query(None),
    severity: Optional[str] = Query(None),
    acknowledged: Optional[bool] = Query(None),
    current_user: SessionUser = Depends(get_current_user)
):
    alerts_col = get_alerts_collection()
    query = {}

    if current_user.role == "warehouse_head" and current_user.warehouse_scope is not None:
        query["warehouse_id"] = current_user.warehouse_scope
    elif warehouse_id is not None:
        query["warehouse_id"] = warehouse_id

    if severity:
        query["severity"] = severity
    if acknowledged is not None:
        query["acknowledged"] = acknowledged

    cursor = alerts_col.find(query).sort("created_at", -1).limit(100)
    docs = await cursor.to_list(length=100)

    result = []
    for d in docs:
        result.append(AlertResponse(
            id=str(d["_id"]),
            warehouse_id=d["warehouse_id"],
            warehouse_name=d["warehouse_name"],
            zone_id=d["zone_id"],
            severity=d["severity"],
            status=d["status"],
            message=d["message"],
            narration=d["narration"],
            created_at=d["created_at"],
            acknowledged=d.get("acknowledged", False),
            acknowledged_by=d.get("acknowledged_by"),
            acknowledged_at=d.get("acknowledged_at")
        ))
    return result

@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: str,
    payload: Optional[AcknowledgeRequest] = None,
    current_user: SessionUser = Depends(get_current_user)
):
    alerts_col = get_alerts_collection()
    try:
        obj_id = ObjectId(alert_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid alert ID format")

    alert = await alerts_col.find_one({"_id": obj_id})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if current_user.role == "warehouse_head" and current_user.warehouse_scope != alert["warehouse_id"]:
        raise HTTPException(status_code=403, detail="Access forbidden")

    acknowledged_by = (payload.acknowledged_by if payload and payload.acknowledged_by else current_user.name)
    now_str = datetime.utcnow().isoformat()

    await alerts_col.update_one(
        {"_id": obj_id},
        {"$set": {
            "acknowledged": True,
            "acknowledged_by": acknowledged_by,
            "acknowledged_at": now_str
        }}
    )

    alert["_id"] = str(alert["_id"])
    alert["acknowledged"] = True
    alert["acknowledged_by"] = acknowledged_by
    alert["acknowledged_at"] = now_str

    return AlertResponse(
        id=alert["_id"],
        warehouse_id=alert["warehouse_id"],
        warehouse_name=alert["warehouse_name"],
        zone_id=alert["zone_id"],
        severity=alert["severity"],
        status=alert["status"],
        message=alert["message"],
        narration=alert["narration"],
        created_at=alert["created_at"],
        acknowledged=True,
        acknowledged_by=acknowledged_by,
        acknowledged_at=now_str
    )
