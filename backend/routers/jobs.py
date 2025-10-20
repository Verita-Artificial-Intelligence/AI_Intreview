from fastapi import APIRouter, Query
from typing import List, Optional
from models import Job, JobCreate, JobStatusUpdate
from services import JobService

router = APIRouter()


@router.post("", response_model=Job)
async def create_job(job_data: JobCreate):
    """Create a new job"""
    return await JobService.create_job(job_data)


@router.get("", response_model=List[Job])
async def get_jobs(status: Optional[str] = Query(None, description="Filter by status")):
    """Get all jobs with optional status filter"""
    return await JobService.get_jobs(status)


@router.get("/{job_id}", response_model=Job)
async def get_job(job_id: str):
    """Get a specific job by ID"""
    return await JobService.get_job(job_id)


@router.get("/{job_id}/can-complete")
async def can_complete_job(job_id: str):
    """Check if a job can be marked as completed (all annotation tasks done)"""
    return await JobService.can_complete_job(job_id)


@router.put("/{job_id}/status", response_model=Job)
async def update_job_status(job_id: str, status_update: JobStatusUpdate):
    """Update job status"""
    return await JobService.update_job_status(job_id, status_update)


@router.delete("/{job_id}")
async def delete_job(job_id: str):
    """Delete a job"""
    return await JobService.delete_job(job_id)
