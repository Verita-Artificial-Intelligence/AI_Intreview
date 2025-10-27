"""
Authentication dependencies for FastAPI routes.

This module exports authentication dependencies for both legacy JWT authentication
and new Clerk-based authentication.
"""

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from config import JWT_SECRET
from database import get_users_collection
from models import User

# Import Clerk authentication dependencies
from utils.clerk_auth import (
    require_candidate_user,
    require_admin_user,
)

security = HTTPBearer()


# Legacy JWT authentication (DEPRECATED - will be removed)
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    """
    DEPRECATED: Legacy JWT authentication.
    This function is kept for backward compatibility but will be removed.
    New code should use require_candidate_user or require_admin_user.

    Validate JWT token and return full user object
    """
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        # Fetch user from database
        users_collection = get_users_collection()
        user_doc = await users_collection.find_one({"id": user_id})

        if not user_doc:
            raise HTTPException(status_code=401, detail="User not found")

        return User(**user_doc)

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# Export Clerk authentication dependencies
# Use these for new code
__all__ = [
    "get_current_user",  # Legacy - DEPRECATED
    "require_candidate_user",  # Clerk candidate authentication
    "require_admin_user",  # Clerk admin authentication
]
