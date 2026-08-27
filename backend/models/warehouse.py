from pydantic import BaseModel, Field
from typing import List, Optional

class ZoneMetadata(BaseModel):
    zone_id: int
    commodity_type: str
    capacity_sacks: int

class WarehouseResponse(BaseModel):
    warehouse_id: int
    name: str
    district: str
    latitude: float
    longitude: float
    zones: List[ZoneMetadata]
    current_occupancy_pct: Optional[float] = None
    latest_status: Optional[str] = None

class SensorReadingResponse(BaseModel):
    Timestamp: str
    Warehouse_ID: int
    Warehouse_Name: str
    District: str
    Latitude: float
    Longitude: float
    Zone_ID: int
    Commodity_Type: str
    Distance_cm: float
    Temperature_C: float
    Humidity_Pct: float = Field(..., alias="Humidity_%")
    Smoke_ppm: float
    Motion: int
    Number_of_Sacks: int
    Avg_Weight_per_Sack_kg: float
    Total_Weight_kg: float
    Zone_Capacity_Sacks: int
    Occupancy_Pct: float
    Vacant_Space_Pct: float
    Rack_Status: str
    Temp_Status: str
    Smoke_Status: str
    Warehouse_Status: str
    Month: int
    Year: int
    Previous_Year_Avg_Fill_Pct: float
    Previous_Year_Days_RackFull: int
    Next_Year_Projected_Occupancy_Pct: float

    class Config:
        populate_by_name = True

class PaginatedReadingsResponse(BaseModel):
    total: int
    page: int
    limit: int
    readings: List[SensorReadingResponse]
