from pydantic import BaseModel
from typing import Optional, List

class AlertResponse(BaseModel):
    id: str
    warehouse_id: int
    warehouse_name: str
    zone_id: int
    severity: str  # Critical, Fire Risk - Critical, High Temp, Warning
    status: str
    message: str
    narration: str
    created_at: str
    acknowledged: bool
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[str] = None

class AcknowledgeRequest(BaseModel):
    acknowledged_by: Optional[str] = None
