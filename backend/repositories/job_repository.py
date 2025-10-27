from typing import Optional, Dict, Any, List
from database import db
from .base_repository import BaseRepository


class JobRepository(BaseRepository):
    """Repository for job data access operations"""

    collection = db.jobs

    @staticmethod
    async def find_by_id(job_id: str) -> Optional[Dict[str, Any]]:
        """Find a single job by ID"""
        return await BaseRepository.find_one(JobRepository.collection, {"id": job_id})

    @staticmethod
    async def find_many(
        status: Optional[str] = None, limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Find multiple jobs with optional status filter.

        Args:
            status: Optional status filter (pending, in_progress, completed, archived)
            limit: Maximum number of results to return
        """
        query = {}
        if status:
            query["status"] = status

        return await BaseRepository.find_many(
            JobRepository.collection, query, limit=limit
        )

    @staticmethod
    async def create(job_doc: Dict[str, Any]) -> bool:
        """Insert a new job document"""
        return await BaseRepository.insert_one(JobRepository.collection, job_doc)

    @staticmethod
    async def update_fields(job_id: str, fields: Dict[str, Any]) -> int:
        """
        Update specific fields on a job.

        Args:
            job_id: The job ID
            fields: Dictionary of fields to update

        Returns:
            Number of documents modified
        """
        return await BaseRepository.update_one(
            JobRepository.collection, {"id": job_id}, fields
        )

    @staticmethod
    async def update_status(job_id: str, status: str) -> int:
        """
        Update the status of a job.

        Args:
            job_id: The job ID
            status: New status (pending, in_progress, completed, archived)

        Returns:
            Number of documents modified
        """
        return await BaseRepository.update_one(
            JobRepository.collection, {"id": job_id}, {"status": status}
        )

    @staticmethod
    async def delete_by_id(job_id: str) -> int:
        """
        Delete a single job by ID.

        Returns:
            Number of documents deleted
        """
        return await BaseRepository.delete_one(JobRepository.collection, {"id": job_id})
