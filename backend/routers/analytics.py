import os
import json
from fastapi import APIRouter, HTTPException, Depends
from db.mongo import get_warehouses_collection, get_sensor_readings_collection
from routers.auth import get_current_user
from models.auth import SessionUser
from core.config import settings

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
METRICS_JSON_PATH = os.path.join(BASE_DIR, "ml", "artifacts", "metrics.json")

@router.get("/overview")
async def get_analytics_overview(current_user: SessionUser = Depends(get_current_user)):
    warehouses_col = get_warehouses_collection()
    sensor_col = get_sensor_readings_collection()

    warehouses = await warehouses_col.find({}).to_list(length=100)

    total_warehouses = len(warehouses)
    total_capacity_sacks = 0
    current_stored_sacks = 0

    for w in warehouses:
        w_id = w["warehouse_id"]
        latest_readings = await sensor_col.find({"Warehouse_ID": w_id}).sort("Timestamp", -1).limit(4).to_list(length=4)
        for r in latest_readings:
            total_capacity_sacks += r.get("Zone_Capacity_Sacks", 0)
            current_stored_sacks += r.get("Number_of_Sacks", 0)

    vacant_sacks = max(0, total_capacity_sacks - current_stored_sacks)
    overall_occupancy_pct = (
        round((current_stored_sacks / total_capacity_sacks) * 100, 1)
        if total_capacity_sacks > 0 else 0.0
    )

    # Status distribution across latest readings
    latest_all = await sensor_col.find({}).sort("Timestamp", -1).limit(40).to_list(length=40)
    status_counts = {}
    for r in latest_all:
        st = r.get("Warehouse_Status", "Safe")
        status_counts[st] = status_counts.get(st, 0) + 1

    return {
        "total_warehouses": total_warehouses,
        "total_capacity_sacks": total_capacity_sacks,
        "current_stored_sacks": current_stored_sacks,
        "vacant_space_sacks": vacant_sacks,
        "overall_occupancy_pct": overall_occupancy_pct,
        "status_distribution": status_counts
    }

@router.get("/model-metrics")
async def get_model_metrics(current_user: SessionUser = Depends(get_current_user)):
    if not os.path.exists(METRICS_JSON_PATH):
        raise HTTPException(status_code=404, detail="ML metrics artifact not found. Please train models first.")

    with open(METRICS_JSON_PATH, "r") as f:
        metrics = json.load(f)

    return metrics
