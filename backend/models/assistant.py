from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ChatMessage(BaseModel):
    role: str  # user, assistant, system
    content: str

class ChatRequest(BaseModel):
    message: str
    warehouse_id: Optional[int] = None
    zone_id: Optional[int] = None
    conversation_history: Optional[List[ChatMessage]] = []

class ChatResponse(BaseModel):
    response: str
    grounded_context: Optional[Dict[str, Any]] = None
    latency_ms: float
    model_used: str
