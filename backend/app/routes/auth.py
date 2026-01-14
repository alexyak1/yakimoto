"""
Authentication endpoints.
"""
import time

import jwt
from fastapi import APIRouter, Form, HTTPException

from ..config import settings


router = APIRouter(tags=["auth"])


@router.post("/login")
def login(password: str = Form(...), remember_me: bool = Form(False)):
    """
    Authenticate admin user.
    
    Args:
        password: Admin password
        remember_me: If True, token expires in 30 days, otherwise uses default expiration
        
    Returns:
        JWT token for authentication
    """
    if password != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Longer expiration for "remember me"
    if remember_me:
        exp_delta = 30 * 24 * 60 * 60  # 30 days
    else:
        exp_delta = settings.JWT_EXP_DELTA_SECONDS
    
    payload = {
        "sub": "admin",
        "exp": time.time() + exp_delta
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    
    return {"token": token}
