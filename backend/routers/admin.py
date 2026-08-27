from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from db.mongo import get_users_collection
from routers.auth import get_current_user
from models.auth import SessionUser, UserResponse
from core.security import hash_password
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/api/admin", tags=["admin"])

def require_hq_admin(current_user: SessionUser = Depends(get_current_user)):
    if current_user.role != "hq_admin":
        raise HTTPException(status_code=403, detail="Access forbidden: HQ Admin role required")
    return current_user

class CreateUserRequest(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: str  # hq_admin or warehouse_head
    warehouse_scope: Optional[int] = None

@router.get("/users", response_model=List[UserResponse])
async def list_users(admin: SessionUser = Depends(require_hq_admin)):
    users_col = get_users_collection()
    users = await users_col.find({}).to_list(length=100)
    return [
        UserResponse(
            email=u["email"],
            name=u["name"],
            role=u["role"],
            warehouse_scope=u.get("warehouse_scope")
        ) for u in users
    ]

@router.post("/users", response_model=UserResponse)
async def create_user(payload: CreateUserRequest, admin: SessionUser = Depends(require_hq_admin)):
    users_col = get_users_collection()
    existing = await users_col.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    doc = {
        "email": payload.email.lower(),
        "name": payload.name,
        "password_hash": hash_password(payload.password),
        "role": payload.role,
        "warehouse_scope": payload.warehouse_scope if payload.role == "warehouse_head" else None,
        "created_at": datetime.utcnow().isoformat()
    }
    await users_col.insert_one(doc)

    return UserResponse(
        email=doc["email"],
        name=doc["name"],
        role=doc["role"],
        warehouse_scope=doc["warehouse_scope"]
    )

@router.delete("/users/{email}")
async def delete_user(email: str, admin: SessionUser = Depends(require_hq_admin)):
    users_col = get_users_collection()
    res = await users_col.delete_one({"email": email.lower()})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": f"User {email} deleted successfully"}
