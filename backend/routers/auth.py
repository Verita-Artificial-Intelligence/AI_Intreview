"""
DEPRECATED: Legacy authentication router.

This authentication system is deprecated and will be removed in a future version.
All new users should authenticate via Clerk.

Migration: Existing users can continue to use this endpoint temporarily,
but should migrate to Clerk authentication by resetting their password.
"""

from fastapi import APIRouter
import warnings
from models import UserCreate, UserLogin
from services import AuthService

router = APIRouter()


@router.post("/register", deprecated=True)
async def register(user_data: UserCreate):
    """
    DEPRECATED: Register a new user with legacy JWT authentication.

    This endpoint is deprecated. New users should sign up via Clerk
    on the frontend (interview-frontend uses Clerk SignUp component).
    """
    warnings.warn(
        "Legacy /api/auth/register is deprecated. Use Clerk authentication instead.",
        DeprecationWarning,
        stacklevel=2,
    )
    return await AuthService.register(user_data)


@router.post("/login", deprecated=True)
async def login(login_data: UserLogin):
    """
    DEPRECATED: Login user and return legacy JWT token.

    This endpoint is deprecated. Users should sign in via Clerk
    on the frontend (interview-frontend uses Clerk SignIn component).
    """
    warnings.warn(
        "Legacy /api/auth/login is deprecated. Use Clerk authentication instead.",
        DeprecationWarning,
        stacklevel=2,
    )
    return await AuthService.login(login_data)
