from fastapi import HTTPException
from typing import List, Optional, Dict, Any
from models import (
    AnnotationTask,
    AnnotationTaskCreate,
    AnnotationTaskUpdate,
    AnnotationTaskAssign,
    AnnotatorStats,
)
from utils import prepare_for_mongo, parse_from_mongo
from repositories import AnnotationRepository, JobRepository, InterviewRepository
from database import db
from datetime import datetime, timezone


class AnnotationService:
    @staticmethod
    async def create_annotation_task(task_data: AnnotationTaskCreate) -> AnnotationTask:
        """Create a new annotation task"""
        # Verify job exists
        job = await JobRepository.find_by_id(task_data.job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        task = AnnotationTask(**task_data.model_dump())
        doc = prepare_for_mongo(task.model_dump())
        await AnnotationRepository.create(doc)
        return task

    @staticmethod
    async def get_annotation_tasks(
        job_id: Optional[str] = None,
        annotator_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[AnnotationTask]:
        """Get annotation tasks with optional filters"""
        tasks_docs = await AnnotationRepository.find_many(
            job_id=job_id, annotator_id=annotator_id, status=status
        )
        return [AnnotationTask(**doc) for doc in tasks_docs]

    @staticmethod
    async def get_annotation_task(task_id: str) -> AnnotationTask:
        """Get a specific annotation task"""
        task_doc = await AnnotationRepository.find_by_id(task_id)
        if not task_doc:
            raise HTTPException(status_code=404, detail="Annotation task not found")
        return AnnotationTask(**task_doc)

    @staticmethod
    async def assign_annotation_task(
        task_id: str, assign_data: AnnotationTaskAssign
    ) -> AnnotationTask:
        """Assign an annotation task to an annotator"""
        # Get task
        task = await AnnotationService.get_annotation_task(task_id)

        # Update task
        update_data = {
            "annotator_id": assign_data.annotator_id,
            "status": "assigned",
            "assigned_at": datetime.now(timezone.utc),
        }

        await AnnotationRepository.update_fields(
            task_id, prepare_for_mongo(update_data)
        )

        task.annotator_id = assign_data.annotator_id
        task.status = "assigned"
        task.assigned_at = datetime.now(timezone.utc)
        return task

    @staticmethod
    async def start_annotation_task(task_id: str) -> AnnotationTask:
        """Mark annotation task as in progress"""
        # Get task
        task = await AnnotationService.get_annotation_task(task_id)

        # If task is already in progress, return it as-is (idempotent)
        if task.status == "in_progress":
            return task

        # Check job status - can only start tasks when job is in_progress
        job = await JobRepository.find_by_id(task.job_id)

        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        if job.get("status") == "pending":
            raise HTTPException(
                status_code=400,
                detail="Cannot start task. Job is in 'pending' status. Tasks can only be started when the job is 'in progress'.",
            )

        if job.get("status") in ["completed", "archived"]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot start task. Job is {job.get('status')}.",
            )

        # Only allow starting from pending or assigned status
        if task.status not in ["pending", "assigned"]:
            raise HTTPException(
                status_code=400, detail="Task cannot be started in current status"
            )

        # Update task
        update_data = {
            "status": "in_progress",
            "started_at": datetime.now(timezone.utc),
        }

        await AnnotationRepository.update_fields(
            task_id, prepare_for_mongo(update_data)
        )

        task.status = "in_progress"
        task.started_at = datetime.now(timezone.utc)
        return task

    @staticmethod
    async def submit_annotation(
        task_id: str, update_data: AnnotationTaskUpdate
    ) -> AnnotationTask:
        """Submit an annotation with quality rating"""
        # Get task
        task = await AnnotationService.get_annotation_task(task_id)

        if (
            not update_data.quality_rating
            or update_data.quality_rating < 1
            or update_data.quality_rating > 5
        ):
            raise HTTPException(
                status_code=400, detail="Quality rating must be between 1 and 5"
            )

        # Update task
        update_dict = {
            "status": "completed",
            "quality_rating": update_data.quality_rating,
            "feedback_notes": update_data.feedback_notes,
            "completed_at": datetime.now(timezone.utc),
        }

        await AnnotationRepository.update_fields(
            task_id, prepare_for_mongo(update_dict)
        )

        task.status = "completed"
        task.quality_rating = update_data.quality_rating
        task.feedback_notes = update_data.feedback_notes
        task.completed_at = datetime.now(timezone.utc)

        # Create earnings record for completed task
        if task.annotator_id:
            from services.earnings_service import EarningsService

            try:
                await EarningsService.create_earning_record(
                    user_id=task.annotator_id, task_id=task.id, job_id=task.job_id
                )
            except Exception as e:
                # Log error but don't fail the task submission
                print(f"Error creating earning record: {e}")

        return task

    @staticmethod
    async def get_available_tasks() -> List[AnnotationTask]:
        """Get all unassigned annotation tasks"""
        tasks_docs = await AnnotationRepository.find_many(status="pending")
        return [AnnotationTask(**doc) for doc in tasks_docs]

    @staticmethod
    async def get_user_tasks(annotator_id: str) -> List[AnnotationTask]:
        """Get all tasks for a specific annotator"""
        tasks_docs = await AnnotationRepository.find_many(annotator_id=annotator_id)
        return [AnnotationTask(**doc) for doc in tasks_docs]

    @staticmethod
    async def delete_annotation_task(task_id: str) -> None:
        """Delete an annotation task"""
        deleted_count = await AnnotationRepository.delete_by_id(task_id)
        if deleted_count == 0:
            raise HTTPException(status_code=404, detail="Annotation task not found")

    @staticmethod
    async def get_annotator_stats(
        search: Optional[str] = None,
        completion_filter: Optional[str] = None,
        performance_filter: Optional[str] = None,
    ) -> List[AnnotatorStats]:
        """Get aggregated statistics for all annotators with optional filters"""
        # Note: This method uses aggregation which requires direct database access
        # MongoDB aggregation pipeline
        pipeline = [
            # Filter out tasks without annotator_id
            {"$match": {"annotator_id": {"$ne": None}}},
            # Group by annotator_id and calculate stats
            {
                "$group": {
                    "_id": "$annotator_id",
                    "total_tasks": {"$sum": 1},
                    "completed_tasks": {
                        "$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}
                    },
                    "ratings": {
                        "$push": {
                            "$cond": [
                                {"$eq": ["$status", "completed"]},
                                "$quality_rating",
                                "$$REMOVE",
                            ]
                        }
                    },
                }
            },
            # Calculate average rating and completion rate
            {
                "$project": {
                    "annotator_id": "$_id",
                    "total_tasks": 1,
                    "completed_tasks": 1,
                    "completion_rate": {
                        "$multiply": [
                            {"$divide": ["$completed_tasks", "$total_tasks"]},
                            100,
                        ]
                    },
                    "avg_rating": {
                        "$cond": [
                            {"$gt": [{"$size": "$ratings"}, 0]},
                            {"$avg": "$ratings"},
                            0,
                        ]
                    },
                }
            },
        ]

        # Execute aggregation
        cursor = db.annotation_tasks.aggregate(pipeline)
        stats_list = await cursor.to_list(length=1000)

        # Fetch all interviews to create a candidate name map
        interviews_cursor = db.interviews.find(
            {}, {"_id": 0, "candidate_id": 1, "candidate_name": 1}
        )
        interviews = await interviews_cursor.to_list(length=10000)

        candidate_name_map = {}
        for interview in interviews:
            if interview.get("candidate_id") and interview.get("candidate_name"):
                candidate_name_map[interview["candidate_id"]] = interview[
                    "candidate_name"
                ]

        # Convert to AnnotatorStats objects and add candidate names
        annotator_stats = []
        for stat in stats_list:
            annotator_id = stat.get("annotator_id", stat.get("_id"))
            name = candidate_name_map.get(annotator_id, "Unknown Annotator")

            # Apply search filter
            if search and search.strip():
                if search.lower() not in name.lower():
                    continue

            completion_rate = stat.get("completion_rate", 0)
            avg_rating = stat.get("avg_rating", 0)

            # Apply completion filter
            if completion_filter and completion_filter != "all":
                if completion_filter == "100" and completion_rate != 100:
                    continue
                elif completion_filter == "75" and not (75 <= completion_rate < 100):
                    continue
                elif completion_filter == "50" and not (50 <= completion_rate < 75):
                    continue
                elif completion_filter == "0" and completion_rate >= 50:
                    continue

            # Apply performance filter
            if performance_filter and performance_filter != "all":
                if performance_filter == "excellent" and avg_rating < 4.5:
                    continue
                elif performance_filter == "good" and not (3.5 <= avg_rating < 4.5):
                    continue
                elif performance_filter == "fair" and not (2.5 <= avg_rating < 3.5):
                    continue
                elif performance_filter == "poor" and avg_rating >= 2.5:
                    continue

            annotator_stats.append(
                AnnotatorStats(
                    annotator_id=annotator_id,
                    name=name,
                    total_tasks=stat.get("total_tasks", 0),
                    completed_tasks=stat.get("completed_tasks", 0),
                    completion_rate=round(completion_rate, 2),
                    avg_rating=round(avg_rating, 2),
                )
            )

        return annotator_stats
