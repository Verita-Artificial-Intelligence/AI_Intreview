from fastapi import APIRouter, Query, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import List, Optional
import os
import shutil
from uuid import uuid4
import logging
from models import AnnotationData, AnnotationDataCreate
from services.annotation_data_service import AnnotationDataService

router = APIRouter()
logger = logging.getLogger(__name__)

# Create uploads directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


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


@router.post("/upload")
async def upload_annotation_file(
    file: UploadFile = File(...), job_id: str = Form(default=None)
):
    """Upload a file for annotation data"""
    try:
        if not file:
            return JSONResponse(status_code=400, content={"error": "No file provided"})

        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid4()}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)

        # Save the file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logger.info(f"File {file.filename} uploaded successfully to {file_path}")

        # Return the URL path
        file_url = f"/uploads/{unique_filename}"

        return JSONResponse(
            status_code=200,
            content={
                "message": "File uploaded successfully",
                "url": file_url,
                "filename": file.filename,
            },
        )

    except Exception as e:
        logger.error(f"Error uploading file {file.filename}: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": "Failed to upload file"})


@router.get("/{data_id}", response_model=AnnotationData)
async def get_annotation_data(data_id: str):
    """Get a specific annotation data by ID"""
    return await AnnotationDataService.get_annotation_data(data_id)


@router.delete("/{data_id}")
async def delete_annotation_data(data_id: str):
    """Delete annotation data"""
    await AnnotationDataService.delete_annotation_data(data_id)
    return {"message": "Annotation data deleted successfully"}
