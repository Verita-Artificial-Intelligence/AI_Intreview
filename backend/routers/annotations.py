from fastapi import APIRouter, Query
from typing import List, Optional
from models import AnnotationTask, AnnotationTaskCreate, AnnotationTaskUpdate, AnnotationTaskAssign, AnnotatorStats
from services.annotation_service import AnnotationService

router = APIRouter()


@router.post("", response_model=AnnotationTask)
async def create_annotation_task(task_data: AnnotationTaskCreate):
    """Create a new annotation task"""
    return await AnnotationService.create_annotation_task(task_data)


@router.get("", response_model=List[AnnotationTask])
async def get_annotation_tasks(
    job_id: Optional[str] = Query(None, description="Filter by job ID"),
    annotator_id: Optional[str] = Query(None, description="Filter by annotator ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
):
    """Get annotation tasks with optional filters"""
    return await AnnotationService.get_annotation_tasks(job_id, annotator_id, status)


@router.get("/available", response_model=List[AnnotationTask])
async def get_available_tasks():
    """Get all unassigned annotation tasks"""
    return await AnnotationService.get_available_tasks()


@router.get("/user/{annotator_id}", response_model=List[AnnotationTask])
async def get_user_tasks(annotator_id: str):
    """Get all tasks for a specific annotator"""
    return await AnnotationService.get_user_tasks(annotator_id)


@router.get("/{task_id}", response_model=AnnotationTask)
async def get_annotation_task(task_id: str):
    """Get a specific annotation task"""
    return await AnnotationService.get_annotation_task(task_id)


@router.post("/{task_id}/assign", response_model=AnnotationTask)
async def assign_annotation_task(task_id: str, assign_data: AnnotationTaskAssign):
    """Assign an annotation task to an annotator"""
    return await AnnotationService.assign_annotation_task(task_id, assign_data)


@router.post("/{task_id}/start", response_model=AnnotationTask)
async def start_annotation_task(task_id: str):
    """Mark annotation task as in progress"""
    return await AnnotationService.start_annotation_task(task_id)


@router.post("/{task_id}/submit", response_model=AnnotationTask)
async def submit_annotation(task_id: str, update_data: AnnotationTaskUpdate):
    """Submit an annotation with quality rating and feedback"""
    return await AnnotationService.submit_annotation(task_id, update_data)


@router.get("/annotators/stats", response_model=List[AnnotatorStats])
async def get_annotator_stats(
    search: Optional[str] = Query(None, description="Search by annotator name"),
    completion_filter: Optional[str] = Query(None, description="Filter by completion rate: all, 100, 75, 50, 0"),
    performance_filter: Optional[str] = Query(None, description="Filter by performance: all, excellent, good, fair, poor"),
):
    """Get aggregated statistics for all annotators with optional filters"""
    return await AnnotationService.get_annotator_stats(search, completion_filter, performance_filter)


@router.delete("/{task_id}")
async def delete_annotation_task(task_id: str):
    """Delete an annotation task"""
    await AnnotationService.delete_annotation_task(task_id)
    return {"message": "Annotation task deleted successfully"}
