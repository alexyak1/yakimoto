"""
Shared dependencies for FastAPI endpoints.
"""
import jwt
from fastapi import Header, HTTPException

from .config import settings


def verify_token(authorization: str = Header(...)):
    """
    Verify JWT token from Authorization header.
    
    Args:
        authorization: Bearer token from request header
        
    Returns:
        Decoded token payload
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError("Invalid auth scheme")
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except Exception as e:
        print(f"Token error: {e}")
        raise HTTPException(status_code=403, detail="Invalid or expired token")
