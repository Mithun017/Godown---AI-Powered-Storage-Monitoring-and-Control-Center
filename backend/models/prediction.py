from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class PredictStatusRequest(BaseModel):
    Distance_cm: float
    Temperature_C: float
    Humidity_Pct: float = Field(..., alias="Humidity_%")
    Smoke_ppm: float
    Motion: int
    Number_of_Sacks: int
    Zone_Capacity_Sacks: int
    Occupancy_Pct: float
    Month: int
    Combustible_Gas_LEL: Optional[float] = Field(2.5, alias="Combustible_Gas_LEL")
    Stock_Tonnes: Optional[float] = Field(None, alias="Stock_Tonnes")
    Warehouse_ID_Code: Optional[str] = Field("TNWC-001", alias="Warehouse_ID_Code")
    Thermal_Moisture_Index: Optional[float] = None
    Combustion_Risk_Score: Optional[float] = None
    Capacity_Pressure_Index: Optional[float] = None

    class Config:
        populate_by_name = True

class FeatureImportance(BaseModel):
    feature: str
    value: float
    importance: float

class PredictStatusResponse(BaseModel):
    status: str
    confidence: float
    top_features: List[FeatureImportance]
    class_probabilities: Optional[Dict[str, float]] = None
    engineered_features: Optional[Dict[str, float]] = None

class PredictYearlyRequest(BaseModel):
    Previous_Year_Avg_Fill_Pct: float
    Previous_Year_Days_RackFull: int

class ConfidenceInterval(BaseModel):
    lower_bound: float
    upper_bound: float

class PredictYearlyResponse(BaseModel):
    warehouse_id: Optional[int] = None
    projected_occupancy_pct: float
    confidence_interval: ConfidenceInterval
