from typing import Optional, Dict, Any, List
from database import db
from .base_repository import BaseRepository


class AnnotationRepository(BaseRepository):
    """Repository for annotation task data access operations"""

    collection = db.annotation_tasks

    @staticmethod
    async def find_by_id(task_id: str) -> Optional[Dict[str, Any]]:
        """Find a single annotation task by ID"""
        return await BaseRepository.find_one(
            AnnotationRepository.collection, {"id": task_id}
        )

    @staticmethod
    async def find_many(
        job_id: Optional[str] = None,
        annotator_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 1000,
    ) -> List[Dict[str, Any]]:
        """
        Find multiple annotation tasks with optional filters.

        Args:
            job_id: Filter by job ID
            annotator_id: Filter by annotator ID
            status: Filter by status (pending, assigned, in_progress, completed, reviewed)
            limit: Maximum number of results to return
        """
        query = {}
        if job_id:
            query["job_id"] = job_id
        if annotator_id:
            query["annotator_id"] = annotator_id
        if status:
            query["status"] = status

        return await BaseRepository.find_many(
            AnnotationRepository.collection, query, limit=limit
        )

    @staticmethod
    async def count_by_job_and_status(job_id: str, statuses: List[str]) -> int:
        """
        Count annotation tasks for a job with specific statuses.
        Used to check if a job can be marked as completed.

        Args:
            job_id: The job ID
            statuses: List of statuses to count (e.g., ["completed", "reviewed"])

        Returns:
            Count of matching tasks
        """
        query = {"job_id": job_id, "status": {"$in": statuses}}
        return await BaseRepository.count_documents(
            AnnotationRepository.collection, query
        )

    @staticmethod
    async def count_by_job(job_id: str) -> int:
        """
        Count all annotation tasks for a job.

        Args:
            job_id: The job ID

        Returns:
            Total count of tasks
        """
        return await BaseRepository.count_documents(
            AnnotationRepository.collection, {"job_id": job_id}
        )

    @staticmethod
    async def create(task_doc: Dict[str, Any]) -> bool:
        """Insert a new annotation task document"""
        return await BaseRepository.insert_one(
            AnnotationRepository.collection, task_doc
        )

    @staticmethod
    async def update_fields(task_id: str, fields: Dict[str, Any]) -> int:
        """
        Update specific fields on an annotation task.

        Args:
            task_id: The task ID
            fields: Dictionary of fields to update

        Returns:
            Number of documents modified
        """
        return await BaseRepository.update_one(
            AnnotationRepository.collection, {"id": task_id}, fields
        )

    @staticmethod
    async def delete_by_id(task_id: str) -> int:
        """
        Delete a single annotation task by ID.

        Returns:
            Number of documents deleted
        """
        return await BaseRepository.delete_one(
            AnnotationRepository.collection, {"id": task_id}
        )
