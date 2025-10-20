from fastapi import HTTPException
from typing import List, Optional
from models import AnnotationData, AnnotationDataCreate
from models.annotation import AnnotationTask
from utils import prepare_for_mongo, parse_from_mongo
from database import get_annotation_data_collection, get_jobs_collection, get_interviews_collection, get_annotations_collection
import logging

logger = logging.getLogger(__name__)


class AnnotationDataService:
    @staticmethod
    async def create_annotation_data(data: AnnotationDataCreate) -> AnnotationData:
        """Create new annotation data and automatically create tasks for accepted candidates"""
        annotation_data_collection = get_annotation_data_collection()
        interviews_collection = get_interviews_collection()
        annotations_collection = get_annotations_collection()

        # Verify job exists
        jobs_collection = get_jobs_collection()
        job = await jobs_collection.find_one({"id": data.job_id}, {"_id": 0})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        # Check job status - can only add annotation data when job is pending
        if job.get("status") != "pending":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot add annotation data. Job is in '{job.get('status')}' status. Annotation data can only be added when job is in 'pending' status."
            )

        # Create annotation data (excluding instructions field which is only for tasks)
        data_dict = data.model_dump()
        instructions = data_dict.pop('instructions')  # Remove instructions from data, use only for tasks

        annotation_data = AnnotationData(**data_dict)
        doc = prepare_for_mongo(annotation_data.model_dump())
        await annotation_data_collection.insert_one(doc)

        # Find all accepted candidates for this job
        accepted_interviews = await interviews_collection.find({
            "job_id": data.job_id,
            "acceptance_status": "accepted"
        }, {"_id": 0}).to_list(length=None)

        # Create annotation tasks for each accepted candidate
        tasks_created = 0
        for interview in accepted_interviews:
            # Prepare data to annotate
            data_to_annotate = {
                "annotation_data_id": annotation_data.id,
                "title": annotation_data.title,
                "description": annotation_data.description,
                "data_type": annotation_data.data_type,
                "data_url": annotation_data.data_url,
                "data_content": annotation_data.data_content,
            }

            # Create annotation task
            task = AnnotationTask(
                job_id=data.job_id,
                annotator_id=interview.get("candidate_id"),
                task_name=data.title,
                task_description=data.description,
                instructions=instructions,
                data_to_annotate=data_to_annotate,
                status="assigned"
            )

            task_doc = prepare_for_mongo(task.model_dump())
            await annotations_collection.insert_one(task_doc)
            tasks_created += 1

        logger.info(f"Created annotation data {annotation_data.id} and {tasks_created} tasks for accepted candidates")

        return annotation_data

    @staticmethod
    async def get_annotation_data_list(job_id: Optional[str] = None) -> List[AnnotationData]:
        """Get annotation data with optional job filter"""
        annotation_data_collection = get_annotation_data_collection()

        query = {}
        if job_id:
            query["job_id"] = job_id

        data_docs = await annotation_data_collection.find(query, {"_id": 0}).to_list(1000)
        return [AnnotationData(**doc) for doc in data_docs]

    @staticmethod
    async def get_annotation_data(data_id: str) -> AnnotationData:
        """Get a specific annotation data by ID"""
        annotation_data_collection = get_annotation_data_collection()

        data_doc = await annotation_data_collection.find_one({"id": data_id}, {"_id": 0})
        if not data_doc:
            raise HTTPException(status_code=404, detail="Annotation data not found")

        return AnnotationData(**data_doc)

    @staticmethod
    async def delete_annotation_data(data_id: str) -> bool:
        """Delete annotation data"""
        annotation_data_collection = get_annotation_data_collection()

        result = await annotation_data_collection.delete_one({"id": data_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Annotation data not found")

        return True
