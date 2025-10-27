from typing import Optional, Dict, Any, List
from database import db
from .base_repository import BaseRepository


class InterviewRepository(BaseRepository):
    """Repository for interview data access operations"""

    collection = db.interviews

    @staticmethod
    async def find_by_id(interview_id: str) -> Optional[Dict[str, Any]]:
        """Find a single interview by ID"""
        return await BaseRepository.find_one(
            InterviewRepository.collection, {"id": interview_id}
        )

    @staticmethod
    async def find_by_candidate_and_job(
        candidate_id: str, job_id: str, statuses: List[str]
    ) -> Optional[Dict[str, Any]]:
        """
        Find an interview for a specific candidate and job with given statuses.
        Used for duplicate checking.
        """
        query = {
            "candidate_id": candidate_id,
            "job_id": job_id,
            "status": {"$in": statuses},
        }
        return await BaseRepository.find_one(InterviewRepository.collection, query)

    @staticmethod
    async def find_many(
        candidate_id: Optional[str] = None,
        job_id: Optional[str] = None,
        limit: int = 1000,
    ) -> List[Dict[str, Any]]:
        """
        Find multiple interviews with optional filters.

        Args:
            candidate_id: Filter by candidate ID
            job_id: Filter by job ID
            limit: Maximum number of results to return
        """
        query = {}
        if candidate_id:
            query["candidate_id"] = candidate_id
        if job_id:
            query["job_id"] = job_id

        return await BaseRepository.find_many(
            InterviewRepository.collection, query, limit=limit
        )

    @staticmethod
    async def create(interview_doc: Dict[str, Any]) -> bool:
        """Insert a new interview document"""
        return await BaseRepository.insert_one(
            InterviewRepository.collection, interview_doc
        )

    @staticmethod
    async def update_fields(interview_id: str, fields: Dict[str, Any]) -> int:
        """
        Update specific fields on an interview.

        Args:
            interview_id: The interview ID
            fields: Dictionary of fields to update

        Returns:
            Number of documents modified
        """
        return await BaseRepository.update_one(
            InterviewRepository.collection, {"id": interview_id}, fields
        )

    @staticmethod
    async def update_acceptance_status(interview_id: str, status: str) -> int:
        """
        Update the acceptance status of an interview.

        Args:
            interview_id: The interview ID
            status: New acceptance status (accepted/rejected/pending)

        Returns:
            Number of documents modified
        """
        return await BaseRepository.update_one(
            InterviewRepository.collection,
            {"id": interview_id},
            {"acceptance_status": status},
        )

    @staticmethod
    async def update_transcript_and_complete(
        interview_id: str, transcript: List[Dict[str, Any]], completed_at: Any
    ) -> int:
        """
        Update interview transcript and mark as completed.
        Used by websocket when interview session ends.

        Args:
            interview_id: The interview ID
            transcript: Sorted transcript entries
            completed_at: Completion timestamp

        Returns:
            Number of documents modified
        """
        return await BaseRepository.update_one(
            InterviewRepository.collection,
            {"id": interview_id},
            {
                "transcript": transcript,
                "status": "completed",
                "completed_at": completed_at,
            },
        )

    @staticmethod
    async def update_video_url(interview_id: str, video_url: str) -> int:
        """
        Update the video URL for an interview.
        Used after video upload completes.

        Args:
            interview_id: The interview ID
            video_url: S3 key or URL for the video

        Returns:
            Number of documents modified
        """
        return await BaseRepository.update_one(
            InterviewRepository.collection,
            {"id": interview_id},
            {"video_url": video_url},
        )

    @staticmethod
    async def delete_by_id(interview_id: str) -> int:
        """
        Delete a single interview by ID.

        Returns:
            Number of documents deleted
        """
        return await BaseRepository.delete_one(
            InterviewRepository.collection, {"id": interview_id}
        )

    @staticmethod
    async def delete_by_candidate_id(candidate_id: str) -> int:
        """
        Delete all interviews for a specific candidate.
        Used for cascade deletion when removing a candidate.

        Returns:
            Number of documents deleted
        """
        return await BaseRepository.delete_many(
            InterviewRepository.collection, {"candidate_id": candidate_id}
        )

    @staticmethod
    async def delete_by_job_id(job_id: str) -> int:
        """
        Delete all interviews for a specific job.
        Used for cascade deletion when removing a job.

        Returns:
            Number of documents deleted
        """
        return await BaseRepository.delete_many(
            InterviewRepository.collection, {"job_id": job_id}
        )
