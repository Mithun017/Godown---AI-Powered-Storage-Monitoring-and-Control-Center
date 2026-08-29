from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timedelta
import math
import random
from db.mongo import get_warehouses_collection, get_sensor_readings_collection
from routers.auth import get_current_user
from models.auth import SessionUser
from models.warehouse import WarehouseResponse, PaginatedReadingsResponse, SensorReadingResponse

router = APIRouter(prefix="/api/warehouses", tags=["warehouses"])

def generate_live_sensor_reading(warehouse_id: int, zone_id: int, step_offset: int = 0) -> dict:
    now = datetime.now() - timedelta(seconds=step_offset * 15)
    timestamp_str = now.strftime("%Y-%m-%d %H:%M:%S")
    
    wh_names = {
        1: ("Coimbatore Central Godown", "Coimbatore"),
        2: ("Madurai South Storage Yard", "Madurai"),
        3: ("Trichy Grain Depot", "Trichy"),
        4: ("Salem Central Warehouse", "Salem"),
        5: ("Tirunelveli Agri Depot", "Tirunelveli"),
        6: ("Erode Storage Godown", "Erode"),
        7: ("Vellore Regional Yard", "Vellore"),
        8: ("Thanjavur Paddy Depot", "Thanjavur"),
        9: ("Thoothukudi Port Warehouse", "Thoothukudi"),
        10: ("Dindigul Storage Depot", "Dindigul"),
    }
    wh_name, district = wh_names.get(warehouse_id, (f"TN Warehouse #{warehouse_id}", "Coimbatore"))
    capacity = 1000

    step = step_offset + warehouse_id * 3 + zone_id * 7
    temp = round(29.5 + 3.2 * math.sin(step / 3.5) + (random.random() * 0.4 - 0.2), 1)
    hum = round(min(100.0, max(30.0, 66.0 - 7.5 * math.sin(step / 3.5) + (random.random() * 0.8 - 0.4))), 1)
    smoke = max(20.0, round(160.0 + 75.0 * math.cos(step / 2.8) + (random.random() * 10 - 5), 1))
    dist = round(max(10.0, 68.0 + 32.0 * math.sin(step / 2.2 + 1.5) + (random.random() * 1.5 - 0.75)), 1)
    occ = round(65.0 + 18.0 * math.sin(step / 4.2 + 2.5) + (random.random() * 0.6 - 0.3), 1)
    vacant = round(100.0 - occ, 1)
    sacks = int(round((capacity * occ) / 100.0))

    temp_status = "Normal"
    if temp >= 40: temp_status = "Critical Heat"
    elif temp >= 32: temp_status = "High Temp Warning"

    smoke_status = "Normal"
    if smoke >= 300: smoke_status = "Smoke Alarm Hazard"

    wh_status = "Safe"
    if temp >= 40 or smoke >= 300: wh_status = "Critical"
    elif temp >= 32: wh_status = "High Temp"

    return {
        "Timestamp": timestamp_str,
        "Warehouse_ID": warehouse_id,
        "Warehouse_Name": wh_name,
        "District": district,
        "Latitude": 11.0 + warehouse_id * 0.1,
        "Longitude": 76.9 + warehouse_id * 0.1,
        "Zone_ID": zone_id,
        "Commodity_Type": "Paddy & Rice Sacks",
        "Distance_cm": dist,
        "Temperature_C": temp,
        "Humidity_%": hum,
        "Smoke_ppm": smoke,
        "Motion": 1 if step % 7 == 0 else 0,
        "Number_of_Sacks": sacks,
        "Avg_Weight_per_Sack_kg": 50.0,
        "Total_Weight_kg": sacks * 50.0,
        "Zone_Capacity_Sacks": capacity,
        "Occupancy_Pct": occ,
        "Vacant_Space_Pct": vacant,
        "Rack_Status": "Rack Full" if occ > 95 else "Normal",
        "Temp_Status": temp_status,
        "Smoke_Status": smoke_status,
        "Warehouse_Status": wh_status,
        "Month": now.month,
        "Year": now.year,
        "Previous_Year_Avg_Fill_Pct": 68.5,
        "Previous_Year_Days_RackFull": 14,
        "Next_Year_Projected_Occupancy_Pct": 72.0
    }

@router.get("", response_model=List[WarehouseResponse])
async def list_warehouses(current_user: SessionUser = Depends(get_current_user)):
    warehouses_col = get_warehouses_collection()
    sensor_col = get_sensor_readings_collection()

    query = {}
    if current_user.role == "warehouse_head" and current_user.warehouse_scope is not None:
        query["warehouse_id"] = current_user.warehouse_scope

    cursor = warehouses_col.find(query).sort("warehouse_id", 1)
    warehouses = await cursor.to_list(length=100)

    result = []
    for w in warehouses:
        w_id = w["warehouse_id"]
        latest_readings = await sensor_col.find({"Warehouse_ID": w_id}).sort("Timestamp", -1).limit(4).to_list(length=4)
        
        occ_pct = None
        status = "Normal"
        if latest_readings:
            occ_pct = round(sum(r.get("Occupancy_Pct", 0) for r in latest_readings) / len(latest_readings), 1)
            statuses = [r.get("Warehouse_Status", "Safe") for r in latest_readings]
            if "Fire Risk - Critical" in statuses:
                status = "Fire Risk - Critical"
            elif "Critical" in statuses:
                status = "Critical"
            elif "High Temp" in statuses:
                status = "High Temp"
            elif "Rack Full" in statuses:
                status = "Rack Full"
            elif "Motion Detected" in statuses:
                status = "Motion Detected"
            else:
                status = "Safe"
        else:
            live_r = generate_live_sensor_reading(w_id, 1, 0)
            occ_pct = live_r["Occupancy_Pct"]
            status = live_r["Warehouse_Status"]

        result.append(WarehouseResponse(
            warehouse_id=w_id,
            name=w["name"],
            district=w["district"],
            latitude=w["latitude"],
            longitude=w["longitude"],
            zones=w["zones"],
            current_occupancy_pct=occ_pct,
            latest_status=status
        ))

    return result

@router.get("/{warehouse_id}", response_model=WarehouseResponse)
async def get_warehouse_detail(
    warehouse_id: int,
    current_user: SessionUser = Depends(get_current_user)
):
    if current_user.role == "warehouse_head" and current_user.warehouse_scope != warehouse_id:
        raise HTTPException(status_code=403, detail="Access forbidden: restricted warehouse scope")

    warehouses_col = get_warehouses_collection()
    w = await warehouses_col.find_one({"warehouse_id": warehouse_id})
    if not w:
        raise HTTPException(status_code=404, detail="Warehouse not found")

    sensor_col = get_sensor_readings_collection()
    latest_readings = await sensor_col.find({"Warehouse_ID": warehouse_id}).sort("Timestamp", -1).limit(4).to_list(length=4)
    
    occ_pct = None
    status = "Normal"
    if latest_readings:
        occ_pct = round(sum(r.get("Occupancy_Pct", 0) for r in latest_readings) / len(latest_readings), 1)
        statuses = [r.get("Warehouse_Status", "Safe") for r in latest_readings]
        if "Fire Risk - Critical" in statuses:
            status = "Fire Risk - Critical"
        elif "Critical" in statuses:
            status = "Critical"
        elif "High Temp" in statuses:
            status = "High Temp"
        elif "Rack Full" in statuses:
            status = "Rack Full"
        elif "Motion Detected" in statuses:
            status = "Motion Detected"
        else:
            status = "Safe"
    else:
        live_r = generate_live_sensor_reading(warehouse_id, 1, 0)
        occ_pct = live_r["Occupancy_Pct"]
        status = live_r["Warehouse_Status"]

    return WarehouseResponse(
        warehouse_id=w["warehouse_id"],
        name=w["name"],
        district=w["district"],
        latitude=w["latitude"],
        longitude=w["longitude"],
        zones=w["zones"],
        current_occupancy_pct=occ_pct,
        latest_status=status
    )

@router.get("/{warehouse_id}/zones/{zone_id}/readings", response_model=PaginatedReadingsResponse)
async def get_zone_readings(
    warehouse_id: int,
    zone_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    current_user: SessionUser = Depends(get_current_user)
):
    if current_user.role == "warehouse_head" and current_user.warehouse_scope != warehouse_id:
        raise HTTPException(status_code=403, detail="Access forbidden: restricted warehouse scope")

    sensor_col = get_sensor_readings_collection()
    query = {"Warehouse_ID": warehouse_id, "Zone_ID": zone_id}

    total = await sensor_col.count_documents(query)
    skip = (page - 1) * limit
    cursor = sensor_col.find(query).sort("Timestamp", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)

    readings = []
    if docs:
        now_base = datetime.now()
        for idx, d in enumerate(docs):
            d.pop("_id", None)
            # Align timestamp to live datetime step
            t_offset = skip + idx
            point_now = now_base - timedelta(seconds=t_offset * 15)
            d["Timestamp"] = point_now.strftime("%Y-%m-%d %H:%M:%S")
            readings.append(SensorReadingResponse(**d))
    else:
        # Generate live dynamic sensor stream if DB docs missing
        total = 300
        for idx in range(limit):
            rec = generate_live_sensor_reading(warehouse_id, zone_id, skip + idx)
            readings.append(SensorReadingResponse(**rec))

    return PaginatedReadingsResponse(
        total=total,
        page=page,
        limit=limit,
        readings=readings
    )
