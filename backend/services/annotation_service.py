from fastapi import HTTPException
from typing import List, Optional, Dict, Any
from models import AnnotationTask, AnnotationTaskCreate, AnnotationTaskUpdate, AnnotationTaskAssign
from utils import prepare_for_mongo, parse_from_mongo
from database import get_annotations_collection, get_jobs_collection
from datetime import datetime, timezone


class AnnotationService:
    @staticmethod
    async def create_annotation_task(task_data: AnnotationTaskCreate) -> AnnotationTask:
        """Create a new annotation task"""
        annotations_collection = get_annotations_collection()

        # Verify job exists
        jobs_collection = get_jobs_collection()
        job = await jobs_collection.find_one({"id": task_data.job_id}, {"_id": 0})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        task = AnnotationTask(**task_data.model_dump())
        doc = prepare_for_mongo(task.model_dump())
        await annotations_collection.insert_one(doc)
        return task

    @staticmethod
    async def get_annotation_tasks(
        job_id: Optional[str] = None,
        annotator_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[AnnotationTask]:
        """Get annotation tasks with optional filters"""
        annotations_collection = get_annotations_collection()

        query = {}
        if job_id:
            query["job_id"] = job_id
        if annotator_id:
            query["annotator_id"] = annotator_id
        if status:
            query["status"] = status

        tasks_docs = await annotations_collection.find(query, {"_id": 0}).to_list(1000)
        return [AnnotationTask(**doc) for doc in tasks_docs]

    @staticmethod
    async def get_annotation_task(task_id: str) -> AnnotationTask:
        """Get a specific annotation task"""
        annotations_collection = get_annotations_collection()

        task_doc = await annotations_collection.find_one({"id": task_id}, {"_id": 0})
        if not task_doc:
            raise HTTPException(status_code=404, detail="Annotation task not found")

        return AnnotationTask(**task_doc)

    @staticmethod
    async def assign_annotation_task(task_id: str, assign_data: AnnotationTaskAssign) -> AnnotationTask:
        """Assign an annotation task to an annotator"""
        annotations_collection = get_annotations_collection()

        # Get task
        task = await AnnotationService.get_annotation_task(task_id)

        # Update task
        update_data = {
            "annotator_id": assign_data.annotator_id,
            "status": "assigned",
            "assigned_at": datetime.now(timezone.utc),
        }

        await annotations_collection.update_one(
            {"id": task_id},
            {"$set": prepare_for_mongo(update_data)}
        )

        task.annotator_id = assign_data.annotator_id
        task.status = "assigned"
        task.assigned_at = datetime.now(timezone.utc)
        return task

    @staticmethod
    async def start_annotation_task(task_id: str) -> AnnotationTask:
        """Mark annotation task as in progress"""
        annotations_collection = get_annotations_collection()

        # Get task
        task = await AnnotationService.get_annotation_task(task_id)

        if task.status not in ["pending", "assigned"]:
            raise HTTPException(status_code=400, detail="Task cannot be started in current status")

        # Update task
        update_data = {
            "status": "in_progress",
            "started_at": datetime.now(timezone.utc),
        }

        await annotations_collection.update_one(
            {"id": task_id},
            {"$set": prepare_for_mongo(update_data)}
        )

        task.status = "in_progress"
        task.started_at = datetime.now(timezone.utc)
        return task

    @staticmethod
    async def submit_annotation(task_id: str, update_data: AnnotationTaskUpdate) -> AnnotationTask:
        """Submit an annotation with quality rating"""
        annotations_collection = get_annotations_collection()

        # Get task
        task = await AnnotationService.get_annotation_task(task_id)

        if not update_data.quality_rating or update_data.quality_rating < 1 or update_data.quality_rating > 5:
            raise HTTPException(status_code=400, detail="Quality rating must be between 1 and 5")

        # Update task
        update_dict = {
            "status": "completed",
            "quality_rating": update_data.quality_rating,
            "feedback_notes": update_data.feedback_notes,
            "completed_at": datetime.now(timezone.utc),
        }

        await annotations_collection.update_one(
            {"id": task_id},
            {"$set": prepare_for_mongo(update_dict)}
        )

        task.status = "completed"
        task.quality_rating = update_data.quality_rating
        task.feedback_notes = update_data.feedback_notes
        task.completed_at = datetime.now(timezone.utc)
        return task

    @staticmethod
    async def get_available_tasks() -> List[AnnotationTask]:
        """Get all unassigned annotation tasks"""
        annotations_collection = get_annotations_collection()

        tasks_docs = await annotations_collection.find(
            {"status": "pending"},
            {"_id": 0}
        ).to_list(1000)
        return [AnnotationTask(**doc) for doc in tasks_docs]

    @staticmethod
    async def get_user_tasks(annotator_id: str) -> List[AnnotationTask]:
        """Get all tasks for a specific annotator"""
        annotations_collection = get_annotations_collection()

        tasks_docs = await annotations_collection.find(
            {"annotator_id": annotator_id},
            {"_id": 0}
        ).to_list(1000)
        return [AnnotationTask(**doc) for doc in tasks_docs]
