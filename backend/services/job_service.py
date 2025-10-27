from fastapi import HTTPException
from typing import List
from models import Job, JobCreate, JobUpdate, JobStatusUpdate
from utils import prepare_for_mongo, parse_from_mongo
from repositories import JobRepository, InterviewRepository, AnnotationRepository


class JobService:
    @staticmethod
    async def create_job(job_data: JobCreate) -> Job:
        """Create a new job"""
        job = Job(**job_data.model_dump())
        doc = prepare_for_mongo(job.model_dump())
        await JobRepository.create(doc)
        return job

    @staticmethod
    async def get_jobs(status: str = None) -> List[Job]:
        """Get all jobs with optional status filter"""
        jobs_docs = await JobRepository.find_many(status=status)
        return [Job(**doc) for doc in jobs_docs]

    @staticmethod
    async def get_job(job_id: str) -> Job:
        """Get a specific job by ID"""
        job_doc = await JobRepository.find_by_id(job_id)
        if not job_doc:
            raise HTTPException(status_code=404, detail="Job not found")
        return Job(**job_doc)

    @staticmethod
    async def update_job(job_id: str, job_update: JobUpdate) -> Job:
        """Update job fields"""
        # Verify job exists
        job = await JobService.get_job(job_id)

        # Build update document with only non-None fields
        update_data = {}
        for field, value in job_update.model_dump(exclude_none=True).items():
            update_data[field] = value

        if not update_data:
            # No fields to update
            return job

        # Update the job
        await JobRepository.update_fields(job_id, update_data)

        # Return updated job
        updated_job_doc = await JobRepository.find_by_id(job_id)
        return Job(**updated_job_doc)

    @staticmethod
    async def update_job_status(job_id: str, status_update: JobStatusUpdate) -> Job:
        """Update job status with validation for forward-only progression"""
        jobs_collection = get_jobs_collection()

        # Verify job exists
        job = await JobService.get_job(job_id)

        # Define valid status progression
        status_order = ["pending", "in_progress", "completed", "archived"]
        current_index = status_order.index(job.status)
        new_index = status_order.index(status_update.status)

        # Validate forward-only progression
        if new_index < current_index:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot move job backward from {job.status} to {status_update.status}. Jobs can only progress forward.",
            )

        # If moving to completed, check if all tasks are done
        if status_update.status == "completed" and job.status != "completed":
            can_complete = await JobService.can_complete_job(job_id)
            if not can_complete["can_complete"]:
                raise HTTPException(status_code=400, detail=can_complete["reason"])

        # Update status
        await JobRepository.update_status(job_id, status_update.status)

        # Return updated job
        job.status = status_update.status
        return job

    @staticmethod
    async def can_complete_job(job_id: str) -> dict:
        """Check if a job can be marked as completed (all annotation tasks must be done)"""
        # Get count of all tasks and completed tasks
        total_tasks = await AnnotationRepository.count_by_job(job_id)

        if total_tasks == 0:
            return {
                "can_complete": True,
                "reason": "No annotation tasks for this job",
                "completed_tasks": 0,
                "total_tasks": 0,
            }

        # Check if all tasks are completed or reviewed
        completed_tasks_count = await AnnotationRepository.count_by_job_and_status(
            job_id, ["completed", "reviewed"]
        )

        can_complete = completed_tasks_count == total_tasks

        return {
            "can_complete": can_complete,
            "reason": (
                f"Only {completed_tasks_count} of {total_tasks} annotation tasks are completed"
                if not can_complete
                else "All tasks completed"
            ),
            "completed_tasks": completed_tasks_count,
            "total_tasks": total_tasks,
        }

    @staticmethod
    async def delete_job(job_id: str):
        """Delete a job and all associated interviews"""
        # Verify job exists
        await JobService.get_job(job_id)

        # Delete all interviews for this job
        await InterviewRepository.delete_by_job_id(job_id)

        # Delete the job
        deleted_count = await JobRepository.delete_by_id(job_id)

        if deleted_count == 0:
            raise HTTPException(status_code=404, detail="Job not found")

        return {
            "success": True,
            "message": "Job and associated interviews deleted successfully",
        }
