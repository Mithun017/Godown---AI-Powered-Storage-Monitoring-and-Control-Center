from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Request
from core.limiter import limiter
from db.mongo import get_predictions_collection
from routers.auth import get_current_user
from models.auth import SessionUser
from models.prediction import (
    PredictStatusRequest, PredictStatusResponse,
    PredictYearlyRequest, PredictYearlyResponse
)
from ml.inference import predict_zone_status, predict_yearly_capacity

router = APIRouter(prefix="/api", tags=["predictions"])

@router.post("/predict/status", response_model=PredictStatusResponse)
@limiter.limit("30/minute")
async def predict_status_endpoint(
    request: Request,
    payload: PredictStatusRequest,
    current_user: SessionUser = Depends(get_current_user)
):
    input_dict = {
        "Distance_cm": payload.Distance_cm,
        "Temperature_C": payload.Temperature_C,
        "Humidity_%": payload.Humidity_Pct,
        "Smoke_ppm": payload.Smoke_ppm,
        "Motion": payload.Motion,
        "Number_of_Sacks": payload.Number_of_Sacks,
        "Zone_Capacity_Sacks": payload.Zone_Capacity_Sacks,
        "Occupancy_Pct": payload.Occupancy_Pct,
        "Month": payload.Month
    }

    res = predict_zone_status(input_dict)

    predictions_col = get_predictions_collection()
    doc = {
        "model": "Model 1 - Zone Condition Classifier",
        "user_email": current_user.email,
        "input": input_dict,
        "output": res,
        "timestamp": datetime.utcnow().isoformat()
    }
    await predictions_col.insert_one(doc)

    return PredictStatusResponse(**res)

@router.post("/predict/yearly-capacity", response_model=PredictYearlyResponse)
@limiter.limit("10/minute")
async def predict_yearly_capacity_endpoint(
    request: Request,
    payload: PredictYearlyRequest,
    warehouse_id: int = None,
    current_user: SessionUser = Depends(get_current_user)
):
    input_dict = {
        "Previous_Year_Avg_Fill_Pct": payload.Previous_Year_Avg_Fill_Pct,
        "Previous_Year_Days_RackFull": payload.Previous_Year_Days_RackFull
    }

    res = predict_yearly_capacity(input_dict)
    res["warehouse_id"] = warehouse_id

    predictions_col = get_predictions_collection()
    doc = {
        "model": "Model 2 - Yearly Storage Capacity Forecast",
        "user_email": current_user.email,
        "warehouse_id": warehouse_id,
        "input": input_dict,
        "output": res,
        "timestamp": datetime.utcnow().isoformat()
    }
    await predictions_col.insert_one(doc)

    return PredictYearlyResponse(**res)

@router.get("/predictions/history")
@router.get("/predict/history")
async def get_prediction_history(
    limit: int = 50,
    current_user: SessionUser = Depends(get_current_user)
):
    predictions_col = get_predictions_collection()
    cursor = predictions_col.find({}).sort("timestamp", -1).limit(limit)
    docs = await cursor.to_list(length=limit)
    for d in docs:
        d.pop("_id", None)
    return docs
