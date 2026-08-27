import secrets
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Cookie, Depends, Response, Header
from db.mongo import get_users_collection, get_sessions_collection
from core.security import verify_password
from core.config import settings
from models.auth import UserLogin, UserResponse, SessionUser

router = APIRouter(prefix="/api/auth", tags=["auth"])

async def get_current_user(
    session_id: Optional[str] = Cookie(None, alias="session_id"),
    authorization: Optional[str] = Header(None)
) -> SessionUser:
    """Dependency to retrieve authenticated user from session cookie or Bearer token header."""
    token = session_id
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]

    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    sessions_col = get_sessions_collection()
    session = await sessions_col.find_one({"session_id": token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    # Check expiry manually in addition to MongoDB TTL index
    expires_at = session.get("expires_at")
    if isinstance(expires_at, datetime) and expires_at < datetime.utcnow():
        await sessions_col.delete_one({"session_id": token})
        raise HTTPException(status_code=401, detail="Session expired")

    return SessionUser(
        session_id=session["session_id"],
        user_id=session["user_id"],
        email=session["email"],
        name=session["name"],
        role=session["role"],
        warehouse_scope=session.get("warehouse_scope")
    )

@router.post("/login", response_model=UserResponse)
async def login(credentials: UserLogin, response: Response):
    users_col = get_users_collection()
    user = await users_col.find_one({"email": credentials.email.lower()})

    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    session_token = secrets.token_hex(32)
    created_at = datetime.utcnow()
    expires_at = created_at + timedelta(seconds=settings.SESSION_EXPIRE_SECONDS)

    session_doc = {
        "session_id": session_token,
        "user_id": str(user["_id"]),
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "warehouse_scope": user.get("warehouse_scope"),
        "created_at": created_at,
        "expires_at": expires_at
    }

    sessions_col = get_sessions_collection()
    await sessions_col.insert_one(session_doc)

    # Set httpOnly cookie with SameSite=Lax, Secure=False (dev), NO explicit domain
    response.set_cookie(
        key="session_id",
        value=session_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=settings.SESSION_EXPIRE_SECONDS
    )

    return UserResponse(
        email=user["email"],
        name=user["name"],
        role=user["role"],
        warehouse_scope=user.get("warehouse_scope")
    )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: SessionUser = Depends(get_current_user)):
    return UserResponse(
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        warehouse_scope=current_user.warehouse_scope
    )

@router.post("/logout")
async def logout(response: Response, session_id: Optional[str] = Cookie(None, alias="session_id")):
    if session_id:
        sessions_col = get_sessions_collection()
        await sessions_col.delete_one({"session_id": session_id})

    response.delete_cookie(key="session_id")
    return {"message": "Logged out successfully"}
