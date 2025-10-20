from fastapi import APIRouter, Query
from typing import List, Optional
from models import AnnotationData, AnnotationDataCreate
from services.annotation_data_service import AnnotationDataService

router = APIRouter()


@router.post("", response_model=AnnotationData)
async def create_annotation_data(data: AnnotationDataCreate):
    """Create new annotation data"""
    return await AnnotationDataService.create_annotation_data(data)


@router.get("", response_model=List[AnnotationData])
async def get_annotation_data_list(
    job_id: Optional[str] = Query(None, description="Filter by job ID")
):
    """Get annotation data with optional job filter"""
    return await AnnotationDataService.get_annotation_data_list(job_id)


@router.get("/{data_id}", response_model=AnnotationData)
async def get_annotation_data(data_id: str):
    """Get a specific annotation data by ID"""
    return await AnnotationDataService.get_annotation_data(data_id)


@router.delete("/{data_id}")
async def delete_annotation_data(data_id: str):
    """Delete annotation data"""
    await AnnotationDataService.delete_annotation_data(data_id)
    return {"message": "Annotation data deleted successfully"}
