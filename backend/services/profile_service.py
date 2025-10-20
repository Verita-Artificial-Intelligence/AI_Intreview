from datetime import datetime, timezone
from database import get_users_collection, get_interviews_collection
from models import ProfileComplete, User, Interview
from fastapi import HTTPException


class ProfileService:
    """Service for handling user profile operations"""

    @staticmethod
    async def complete_profile(user_id: str, profile_data: ProfileComplete) -> User:
        """
        Complete user profile

        Args:
            user_id: The user's ID
            profile_data: Profile completion data

        Returns:
            Updated user object
        """
        users_collection = get_users_collection()

        # Update user with profile data
        update_data = {
            **profile_data.model_dump(),
            "profile_completed": True,
        }

        result = await users_collection.update_one(
            {"id": user_id}, {"$set": update_data}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")

        # Get updated user
        user_doc = await users_collection.find_one({"id": user_id})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")

        user = User(**user_doc)
        return user

    @staticmethod
    async def get_interview_status(user_id: str) -> dict:
        """
        Get user's profile completion status

        Args:
            user_id: The user's ID

        Returns:
            Dictionary with profile_completed status
        """
        users_collection = get_users_collection()

        # Get user
        user_doc = await users_collection.find_one({"id": user_id})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")

        user = User(**user_doc)

        response = {
            "profile_completed": user.profile_completed,
        }

        return response
