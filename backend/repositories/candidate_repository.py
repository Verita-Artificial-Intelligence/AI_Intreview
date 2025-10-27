from typing import Optional, Dict, Any, List
from database import db
from .base_repository import BaseRepository


class CandidateRepository(BaseRepository):
    """
    Repository for candidate data access operations.
    Note: Candidates are stored in the users collection.
    """

    collection = db.users

    @staticmethod
    async def find_by_id(candidate_id: str) -> Optional[Dict[str, Any]]:
        """Find a single candidate by ID"""
        return await BaseRepository.find_one(
            CandidateRepository.collection, {"id": candidate_id}
        )

    @staticmethod
    async def find_by_email(email: str) -> Optional[Dict[str, Any]]:
        """Find a candidate by email address"""
        return await BaseRepository.find_one(
            CandidateRepository.collection, {"email": email}
        )

    @staticmethod
    async def find_many(
        search_query: Optional[str] = None, limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        Find multiple candidates with optional search filter.

        Args:
            search_query: Optional search text for name/email/position
            limit: Maximum number of results to return
        """
        query = {}
        if search_query:
            # MongoDB text search or regex pattern matching
            query["$or"] = [
                {"name": {"$regex": search_query, "$options": "i"}},
                {"email": {"$regex": search_query, "$options": "i"}},
                {"position": {"$regex": search_query, "$options": "i"}},
            ]

        return await BaseRepository.find_many(
            CandidateRepository.collection, query, limit=limit
        )

    @staticmethod
    async def create(candidate_doc: Dict[str, Any]) -> bool:
        """Insert a new candidate document"""
        return await BaseRepository.insert_one(
            CandidateRepository.collection, candidate_doc
        )

    @staticmethod
    async def update_education(candidate_id: str, education: Any) -> int:
        """
        Update the education field for a candidate.

        Args:
            candidate_id: The candidate ID
            education: Education data (string, list, or dict)

        Returns:
            Number of documents modified
        """
        return await BaseRepository.update_one(
            CandidateRepository.collection,
            {"id": candidate_id},
            {"education": education},
        )

    @staticmethod
    async def update_fields(candidate_id: str, fields: Dict[str, Any]) -> int:
        """
        Update specific fields on a candidate.

        Args:
            candidate_id: The candidate ID
            fields: Dictionary of fields to update

        Returns:
            Number of documents modified
        """
        return await BaseRepository.update_one(
            CandidateRepository.collection, {"id": candidate_id}, fields
        )

    @staticmethod
    async def delete_by_id(candidate_id: str) -> int:
        """
        Delete a single candidate by ID.

        Returns:
            Number of documents deleted
        """
        return await BaseRepository.delete_one(
            CandidateRepository.collection, {"id": candidate_id}
        )
