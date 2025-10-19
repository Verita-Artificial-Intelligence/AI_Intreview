from fastapi import APIRouter, File, UploadFile, Form
from typing import List, Optional
from models import Interview, InterviewCreate
from services import InterviewService
import logging
import aiofiles
from pathlib import Path
import os

router = APIRouter(prefix="/interviews", tags=["Interviews"])
logger = logging.getLogger(__name__)

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads/videos")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("", response_model=Interview)
async def create_interview(interview_data: InterviewCreate):
    """Create a new interview"""
    return await InterviewService.create_interview(interview_data)


@router.get("", response_model=List[Interview])
async def get_interviews():
    """Get all interviews"""
    return await InterviewService.get_interviews()


@router.get("/{interview_id}", response_model=Interview)
async def get_interview(interview_id: str):
    """Get a specific interview by ID"""
    return await InterviewService.get_interview(interview_id)


@router.post("/{interview_id}/complete")
async def complete_interview(interview_id: str):
    """Mark interview as completed and generate summary"""
    return await InterviewService.complete_interview(interview_id)


@router.post("/upload-video")
async def upload_interview_video(
    video: UploadFile = File(...),
    session_id: str = Form(...),
    interview_id: Optional[str] = Form(None),
):
    """Upload interview video recording"""
    try:
        # Generate filename
        filename = f"{session_id}.webm"
        if interview_id:
            filename = f"{interview_id}_{session_id}.webm"

        file_path = UPLOAD_DIR / filename

        # Save file
        async with aiofiles.open(file_path, "wb") as f:
            content = await video.read()
            await f.write(content)

        logger.info(f"Video uploaded: {filename} ({len(content)} bytes)")

        return {
            "success": True,
            "filename": filename,
            "size": len(content),
            "path": str(file_path),
        }

    except Exception as e:
        logger.error(f"Error uploading video: {e}")
        return {"success": False, "error": str(e)}
