from typing import Optional, Dict, Any, List
from database import db
from .base_repository import BaseRepository


class EmailSendRepository(BaseRepository):
    """Repository for email send log data access operations."""

    collection = db.email_sends

    @staticmethod
    async def find_by_id(email_send_id: str) -> Optional[Dict[str, Any]]:
        """Find a single email send record by ID"""
        return await BaseRepository.find_one(
            EmailSendRepository.collection, {"id": email_send_id}
        )

    @staticmethod
    async def create(email_send_doc: Dict[str, Any]) -> bool:
        """Insert a new email send document"""
        return await BaseRepository.insert_one(
            EmailSendRepository.collection, email_send_doc
        )

    @staticmethod
    async def find_by_assignment(
        assignment_id: str, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Find email send records for an assignment.

        Args:
            assignment_id: The assignment ID
            limit: Maximum number of results (default: 50)

        Returns:
            List of email send documents, sorted by created_at descending
        """
        return await BaseRepository.find_many(
            EmailSendRepository.collection,
            {"assignment_id": assignment_id},
            sort=[("created_at", -1)],
            limit=limit,
        )

    @staticmethod
    async def find_by_project(project_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Find email send records for a project by joining with assignments.

        Args:
            project_id: The project ID
            limit: Maximum number of results (default: 50)

        Returns:
            List of email send documents with assignment info
        """
        # Use MongoDB aggregation to join assignments
        pipeline = [
            {
                "$lookup": {
                    "from": "assignments",
                    "localField": "assignment_id",
                    "foreignField": "id",
                    "as": "assignment",
                }
            },
            {"$unwind": "$assignment"},
            {"$match": {"assignment.project_id": project_id}},
            {"$sort": {"created_at": -1}},
            {"$limit": limit},
            {"$project": {"_id": 0}},
        ]

        cursor = EmailSendRepository.collection.aggregate(pipeline)
        return await cursor.to_list(limit)

    @staticmethod
    async def update_fields(email_send_id: str, fields: Dict[str, Any]) -> int:
        """
        Update specific fields on an email send record.

        Args:
            email_send_id: The email send ID
            fields: Dictionary of fields to update

        Returns:
            Number of documents modified
        """
        return await BaseRepository.update_one(
            EmailSendRepository.collection, {"id": email_send_id}, fields
        )
