from fastapi import APIRouter, Depends, HTTPException
from models import User, ProfileComplete
from services import ProfileService
from dependencies import get_current_user

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("/me", response_model=User)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    """Get current user's profile"""
    return current_user


@router.put("/complete", response_model=User)
async def complete_profile(
    profile_data: ProfileComplete, current_user: User = Depends(get_current_user)
):
    """Complete user profile after signup"""
    return await ProfileService.complete_profile(current_user.id, profile_data)


@router.get("/interview-status")
async def get_interview_status(current_user: User = Depends(get_current_user)):
    """Get current user's interview status"""
    return await ProfileService.get_interview_status(current_user.id)
