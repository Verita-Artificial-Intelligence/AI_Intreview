from typing import Optional, Dict, Any, List
from database import db
from .base_repository import BaseRepository


class AssignmentRepository(BaseRepository):
    """Repository for assignment data access operations."""

    collection = db.assignments

    @staticmethod
    async def find_by_id(assignment_id: str) -> Optional[Dict[str, Any]]:
        """Find a single assignment by ID"""
        return await BaseRepository.find_one(
            AssignmentRepository.collection, {"id": assignment_id}
        )

    @staticmethod
    async def find_by_project_and_candidate(
        project_id: str, candidate_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Check for existing assignment (enforce unique constraint).

        Args:
            project_id: The project ID
            candidate_id: The candidate ID

        Returns:
            Active assignment document if exists, None otherwise
        """
        return await BaseRepository.find_one(
            AssignmentRepository.collection,
            {
                "project_id": project_id,
                "candidate_id": candidate_id,
                "status": "active",
            },
        )

    @staticmethod
    async def find_by_project(
        project_id: str, status: Optional[str] = "active"
    ) -> List[Dict[str, Any]]:
        """
        Find all assignments for a project.

        Args:
            project_id: The project ID
            status: Optional status filter (default: "active")

        Returns:
            List of assignment documents
        """
        query = {"project_id": project_id}
        if status:
            query["status"] = status

        return await BaseRepository.find_many(
            AssignmentRepository.collection, query, limit=10000
        )

    @staticmethod
    async def count_by_project(
        project_id: str, status: Optional[str] = "active"
    ) -> int:
        """
        Count assignments for a project.

        Args:
            project_id: The project ID
            status: Optional status filter (default: "active")

        Returns:
            Count of assignments
        """
        query = {"project_id": project_id}
        if status:
            query["status"] = status

        return await BaseRepository.count_documents(
            AssignmentRepository.collection, query
        )

    @staticmethod
    async def find_by_candidate(candidate_id: str) -> List[Dict[str, Any]]:
        """
        Find all active assignments for a candidate.

        Args:
            candidate_id: The candidate ID

        Returns:
            List of active assignment documents
        """
        return await BaseRepository.find_many(
            AssignmentRepository.collection,
            {"candidate_id": candidate_id, "status": "active"},
            limit=100,
        )

    @staticmethod
    async def create(assignment_doc: Dict[str, Any]) -> bool:
        """Insert a new assignment document"""
        return await BaseRepository.insert_one(
            AssignmentRepository.collection, assignment_doc
        )

    @staticmethod
    async def update_fields(assignment_id: str, fields: Dict[str, Any]) -> int:
        """
        Update specific fields on an assignment.

        Args:
            assignment_id: The assignment ID
            fields: Dictionary of fields to update

        Returns:
            Number of documents modified
        """
        return await BaseRepository.update_one(
            AssignmentRepository.collection, {"id": assignment_id}, fields
        )

    @staticmethod
    async def delete(assignment_id: str) -> Any:
        """
        Delete an assignment by ID.

        Args:
            assignment_id: The assignment ID

        Returns:
            Delete result
        """
        return await BaseRepository.delete_one(
            AssignmentRepository.collection, {"id": assignment_id}
        )
