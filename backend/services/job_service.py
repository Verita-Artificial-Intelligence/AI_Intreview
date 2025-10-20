from fastapi import HTTPException
from typing import List
from models import Job, JobCreate, JobStatusUpdate
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
    async def update_job_status(job_id: str, status_update: JobStatusUpdate) -> Job:
        """Update job status"""
        jobs_collection = get_jobs_collection()

        # Verify job exists
        job = await JobService.get_job(job_id)

        # Update status
        await jobs_collection.update_one(
            {"id": job_id}, {"$set": {"status": status_update.status}}
        )

        # Return updated job
        job.status = status_update.status
        return job

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

        return {"success": True, "message": "Job and associated interviews deleted successfully"}
