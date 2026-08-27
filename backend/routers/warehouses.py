from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from db.mongo import get_warehouses_collection, get_sensor_readings_collection
from routers.auth import get_current_user
from models.auth import SessionUser
from models.warehouse import WarehouseResponse, PaginatedReadingsResponse, SensorReadingResponse

router = APIRouter(prefix="/api/warehouses", tags=["warehouses"])

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
        # Fetch latest reading to calculate current average occupancy and overall status
        latest_readings = await sensor_col.find({"Warehouse_ID": w_id}).sort("Timestamp", -1).limit(4).to_list(length=4)
        
        occ_pct = None
        status = "Normal"
        if latest_readings:
            occ_pct = round(sum(r.get("Occupancy_Pct", 0) for r in latest_readings) / len(latest_readings), 1)
            # Pick highest severity status if present
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
    for d in docs:
        d.pop("_id", None)
        readings.append(SensorReadingResponse(**d))

    return PaginatedReadingsResponse(
        total=total,
        page=page,
        limit=limit,
        readings=readings
    )
