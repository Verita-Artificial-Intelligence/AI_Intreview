from fastapi import HTTPException
from typing import List, Optional
from models import AnnotationData, AnnotationDataCreate
from utils import prepare_for_mongo, parse_from_mongo
from database import get_annotation_data_collection, get_jobs_collection


class AnnotationDataService:
    @staticmethod
    async def create_annotation_data(data: AnnotationDataCreate) -> AnnotationData:
        """Create new annotation data"""
        annotation_data_collection = get_annotation_data_collection()

        # Verify job exists
        jobs_collection = get_jobs_collection()
        job = await jobs_collection.find_one({"id": data.job_id}, {"_id": 0})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        annotation_data = AnnotationData(**data.model_dump())
        doc = prepare_for_mongo(annotation_data.model_dump())
        await annotation_data_collection.insert_one(doc)
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
