from typing import Optional, Dict, Any, List
from database import db
from .base_repository import BaseRepository


class ProjectRepository(BaseRepository):
    """Repository for project data access operations."""

    collection = db.projects

    @staticmethod
    async def find_by_id(project_id: str) -> Optional[Dict[str, Any]]:
        """Find a single project by ID"""
        return await BaseRepository.find_one(
            ProjectRepository.collection, {"id": project_id}
        )

    @staticmethod
    async def find_many(
        query: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 1000,
        skip: int = 0,
        sort: Optional[List[tuple]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Find multiple projects with optional filters.

        Args:
            query: Optional search text for name/description
            status: Optional status filter
            limit: Maximum number of results to return
            skip: Number of documents to skip (for pagination)
            sort: Optional list of (field, direction) tuples for sorting
        """
        mongo_query = {}

        # Text search on name and description
        if query:
            mongo_query["$or"] = [
                {"name": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}},
            ]

        # Status filter
        if status:
            mongo_query["status"] = status

        # Build cursor
        cursor = ProjectRepository.collection.find(mongo_query, {"_id": 0})

        # Apply sorting
        if sort:
            cursor = cursor.sort(sort)
        else:
            # Default sort by created_at descending
            cursor = cursor.sort([("created_at", -1)])

        # Apply pagination
        cursor = cursor.skip(skip).limit(limit)

        return await cursor.to_list(limit)

    @staticmethod
    async def count_documents(filters: Dict[str, Any]) -> int:
        """Count documents matching the query"""
        return await BaseRepository.count_documents(
            ProjectRepository.collection, filters
        )

    @staticmethod
    async def create(project_doc: Dict[str, Any]) -> bool:
        """Insert a new project document"""
        return await BaseRepository.insert_one(
            ProjectRepository.collection, project_doc
        )

    @staticmethod
    async def update_fields(project_id: str, fields: Dict[str, Any]) -> int:
        """
        Update specific fields on a project.

        Args:
            project_id: The project ID
            fields: Dictionary of fields to update

        Returns:
            Number of documents modified
        """
        return await BaseRepository.update_one(
            ProjectRepository.collection, {"id": project_id}, fields
        )

    @staticmethod
    async def delete_by_id(project_id: str) -> int:
        """
        Delete a single project by ID.

        Returns:
            Number of documents deleted
        """
        return await BaseRepository.delete_one(
            ProjectRepository.collection, {"id": project_id}
        )
