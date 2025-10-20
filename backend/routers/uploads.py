from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import JSONResponse
import logging
from uuid import uuid4
import os
import shutil
from database import get_interviews_collection
from models.user import User
from dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

UPLOAD_DIR = os.path.join("uploads", "videos")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Create general uploads directory for annotation data
ANNOTATION_UPLOAD_DIR = "uploads"
os.makedirs(ANNOTATION_UPLOAD_DIR, exist_ok=True)

@router.post("/interviews/upload/video")
async def upload_video(
    interview_id: str = Form(...),
    session_id: str = Form(...),
    video: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload video recording of an interview.
    """
    try:
        if not interview_id or not session_id:
            raise HTTPException(status_code=400, detail="Interview ID and Session ID are required.")

        # Generate a unique filename
        file_extension = os.path.splitext(video.filename)[1]
        video_filename = f"{interview_id}_{session_id}_{uuid4()}{file_extension}"
        video_path = os.path.join(UPLOAD_DIR, video_filename)

        # Save the video file
        with open(video_path, "wb") as buffer:
            buffer.write(await video.read())

        logger.info(f"Video for interview {interview_id} saved to {video_path}")

        # Update the interview record in the database (relaxed filter to ensure save)
        interviews_collection = get_interviews_collection()
        result = await interviews_collection.update_one(
            {"_id": interview_id},
            {"$set": {"video_url": video_path}},
        )

        if result.matched_count == 0:
            logger.warning(
                f"Could not find matching interview {interview_id} to save video path."
            )

        return JSONResponse(status_code=200, content={"message": "Video uploaded successfully", "path": video_path})

    except Exception as e:
        logger.error(f"Error uploading video for interview {interview_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to upload video.")


@router.post("/files/upload")
async def upload_file(
    file: UploadFile = File(...),
    job_id: str = Form(default=None)
):
    """
    Upload a file for annotation data.
    """
    try:
        if not file:
            raise HTTPException(status_code=400, detail="No file provided")

        # Generate a unique filename to avoid collisions
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid4()}{file_extension}"
        file_path = os.path.join(ANNOTATION_UPLOAD_DIR, unique_filename)

        # Save the file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logger.info(f"File {file.filename} uploaded successfully to {file_path}")

        # Return the URL path where the file can be accessed
        file_url = f"/uploads/{unique_filename}"

        return JSONResponse(
            status_code=200,
            content={
                "message": "File uploaded successfully",
                "url": file_url,
                "filename": file.filename
            }
        )

    except Exception as e:
        logger.error(f"Error uploading file {file.filename}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to upload file.")
