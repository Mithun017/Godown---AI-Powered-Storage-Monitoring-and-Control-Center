from pydantic import BaseModel, EmailStr
from typing import Optional

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    email: EmailStr
    name: str
    role: str
    warehouse_scope: Optional[int] = None

class SessionUser(BaseModel):
    session_id: str
    user_id: str
    email: EmailStr
    name: str
    role: str
    warehouse_scope: Optional[int] = None
