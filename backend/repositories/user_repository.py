from typing import Optional, Dict, Any
from database import db
from .base_repository import BaseRepository


class UserRepository(BaseRepository):
    """Repository for user data access operations"""

    collection = db.users

    @staticmethod
    async def find_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        """Find a single user by ID"""
        return await BaseRepository.find_one(UserRepository.collection, {"id": user_id})

    @staticmethod
    async def find_by_email(email: str) -> Optional[Dict[str, Any]]:
        """Find a user by email address"""
        return await BaseRepository.find_one(
            UserRepository.collection, {"email": email}
        )

    @staticmethod
    async def create(user_doc: Dict[str, Any]) -> bool:
        """Insert a new user document"""
        return await BaseRepository.insert_one(UserRepository.collection, user_doc)

    @staticmethod
    async def update_fields(user_id: str, fields: Dict[str, Any]) -> int:
        """
        Update specific fields on a user.

        Args:
            user_id: The user ID
            fields: Dictionary of fields to update

        Returns:
            Number of documents modified
        """
        return await BaseRepository.update_one(
            UserRepository.collection, {"id": user_id}, fields
        )
