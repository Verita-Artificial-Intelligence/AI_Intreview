from datetime import datetime, timezone
from database import get_users_collection, get_interviews_collection
from models import ProfileComplete, User, Interview
from fastapi import HTTPException


class ProfileService:
    """Service for handling user profile operations"""

    @staticmethod
    async def complete_profile(user_id: str, profile_data: ProfileComplete) -> User:
        """
        Complete user profile and create their interview

        Args:
            user_id: The user's ID
            profile_data: Profile completion data

        Returns:
            Updated user object
        """
        users_collection = get_users_collection()
        interviews_collection = get_interviews_collection()

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

        # Create interview for the user
        interview = Interview(
            candidate_id=user.id,
            candidate_name=profile_data.name,
            position=profile_data.position,
            status="not_started",
        )

        await interviews_collection.insert_one(interview.model_dump())

        # Update user with interview ID
        await users_collection.update_one(
            {"id": user_id}, {"$set": {"interview_id": interview.id}}
        )
        user.interview_id = interview.id

        return user

    @staticmethod
    async def get_interview_status(user_id: str) -> dict:
        """
        Get user's interview status

        Args:
            user_id: The user's ID

        Returns:
            Dictionary with profile_completed, interview_id, and status
        """
        users_collection = get_users_collection()
        interviews_collection = get_interviews_collection()

        # Get user
        user_doc = await users_collection.find_one({"id": user_id})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")

        user = User(**user_doc)

        response = {
            "profile_completed": user.profile_completed,
            "interview_id": user.interview_id,
            "status": None,
        }

        # Get interview status if exists
        if user.interview_id:
            interview_doc = await interviews_collection.find_one(
                {"id": user.interview_id}
            )
            if interview_doc:
                interview = Interview(**interview_doc)
                response["status"] = interview.status

        return response
