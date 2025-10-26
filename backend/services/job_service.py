from fastapi import HTTPException
from typing import List
from models import Job, JobCreate, JobUpdate, JobStatusUpdate
from utils import prepare_for_mongo, parse_from_mongo
from database import get_jobs_collection


class JobService:
    @staticmethod
    async def create_job(job_data: JobCreate) -> Job:
        """Create a new job"""
        jobs_collection = get_jobs_collection()
        job = Job(**job_data.model_dump())
        doc = prepare_for_mongo(job.model_dump())
        await jobs_collection.insert_one(doc)
        return job

    @staticmethod
    async def get_jobs(status: str = None) -> List[Job]:
        """Get all jobs with optional status filter"""
        jobs_collection = get_jobs_collection()

        query = {}
        if status:
            query["status"] = status

        jobs_docs = await jobs_collection.find(query, {"_id": 0}).to_list(100)
        return [Job(**doc) for doc in jobs_docs]

    @staticmethod
    async def get_job(job_id: str) -> Job:
        """Get a specific job by ID"""
        jobs_collection = get_jobs_collection()

        job_doc = await jobs_collection.find_one({"id": job_id}, {"_id": 0})
        if not job_doc:
            raise HTTPException(status_code=404, detail="Job not found")

        return Job(**job_doc)

    @staticmethod
    async def update_job(job_id: str, job_update: JobUpdate) -> Job:
        """Update job fields"""
        jobs_collection = get_jobs_collection()

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
        await jobs_collection.update_one({"id": job_id}, {"$set": update_data})

        # Return updated job
        updated_job_doc = await jobs_collection.find_one({"id": job_id}, {"_id": 0})
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
        await jobs_collection.update_one(
            {"id": job_id}, {"$set": {"status": status_update.status}}
        )

        # Return updated job
        job.status = status_update.status
        return job

    @staticmethod
    async def can_complete_job(job_id: str) -> dict:
        """Check if a job can be marked as completed (all annotation tasks must be done)"""
        from database import get_annotations_collection

        annotations_collection = get_annotations_collection()

        # Get all annotation tasks for this job
        all_tasks = await annotations_collection.find(
            {"job_id": job_id}, {"_id": 0}
        ).to_list(1000)

        if len(all_tasks) == 0:
            return {
                "can_complete": True,
                "reason": "No annotation tasks for this job",
                "completed_tasks": 0,
                "total_tasks": 0,
            }

        # Check if all tasks are completed or reviewed
        completed_tasks = [
            task
            for task in all_tasks
            if task.get("status") in ["completed", "reviewed"]
        ]

        can_complete = len(completed_tasks) == len(all_tasks)

        return {
            "can_complete": can_complete,
            "reason": (
                f"Only {len(completed_tasks)} of {len(all_tasks)} annotation tasks are completed"
                if not can_complete
                else "All tasks completed"
            ),
            "completed_tasks": len(completed_tasks),
            "total_tasks": len(all_tasks),
        }

    @staticmethod
    async def delete_job(job_id: str):
        """Delete a job and all associated interviews"""
        from database import db

        jobs_collection = get_jobs_collection()

        # Verify job exists
        await JobService.get_job(job_id)

        # Delete all interviews for this job
        await db.interviews.delete_many({"job_id": job_id})

        # Delete the job
        result = await jobs_collection.delete_one({"id": job_id})

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Job not found")

        return {
            "success": True,
            "message": "Job and associated interviews deleted successfully",
        }
