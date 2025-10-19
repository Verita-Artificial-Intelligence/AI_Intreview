from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import JSONResponse
import logging
from uuid import uuid4
import os
from database import get_interviews_collection
from models.user import User
from dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

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

        # Update the interview record in the database
        interviews_collection = get_interviews_collection()
        result = await interviews_collection.update_one(
            {"_id": interview_id, "user_id": current_user.id},
            {"$set": {"video_url": video_path}}
        )

        if result.matched_count == 0:
            # This could happen if the interview doesn't exist or doesn't belong to the user
            # For simplicity, we'll log a warning. In a real app, you might delete the orphaned file.
            logger.warning(f"Could not find matching interview {interview_id} for user {current_user.id} to save video path.")
            # Still, we return success as the file is uploaded.
            
        return JSONResponse(status_code=200, content={"message": "Video uploaded successfully", "path": video_path})

    except Exception as e:
        logger.error(f"Error uploading video for interview {interview_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to upload video.")
