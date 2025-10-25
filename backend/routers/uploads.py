from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
import logging
from uuid import uuid4
import os
from database import get_interviews_collection
from models.user import User
from dependencies import get_current_user
from services.s3_service import s3_service
import mimetypes

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/interviews/upload/video")
async def upload_video(
    interview_id: str = Form(...),
    session_id: str = Form(...),
    video: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload video recording of an interview to S3.
    """
    try:
        if not interview_id or not session_id:
            raise HTTPException(status_code=400, detail="Interview ID and Session ID are required.")

        file_extension = os.path.splitext(video.filename)[1]
        video_filename = f"{interview_id}_{session_id}_{uuid4()}{file_extension}"

        s3_key = s3_service.generate_s3_key(f"videos/{interview_id}", video_filename)
        video_content = await video.read()

        content_type = video.content_type or "video/webm"
        uploaded_key = await s3_service.upload_file(
            file_content=video_content,
            s3_key=s3_key,
            content_type=content_type,
            is_temp=False
        )

        if not uploaded_key:
            raise HTTPException(status_code=500, detail="Failed to upload video to S3")

        logger.info(f"Video for interview {interview_id} uploaded to S3: {s3_key}")

        interviews_collection = get_interviews_collection()
        result = await interviews_collection.update_one(
            {"_id": interview_id},
            {"$set": {"video_url": s3_key}},
        )

        if result.matched_count == 0:
            logger.warning(
                f"Could not find matching interview {interview_id} to save video URL."
            )

        url_path = f"/uploads/{s3_key}"

        return JSONResponse(
            status_code=200,
            content={
                "message": "Video uploaded successfully",
                "path": s3_key,
                "url": url_path
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading video for interview {interview_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to upload video.")


@router.post("/files/upload")
async def upload_file(
    file: UploadFile = File(...),
    job_id: str = Form(default=None)
):
    """
    Upload a file for annotation data to S3.
    """
    try:
        if not file:
            raise HTTPException(status_code=400, detail="No file provided")

        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid4()}{file_extension}"

        s3_key = s3_service.generate_s3_key("annotations", unique_filename)
        file_content = await file.read()

        content_type = file.content_type or mimetypes.guess_type(file.filename)[0] or "application/octet-stream"
        uploaded_key = await s3_service.upload_file(
            file_content=file_content,
            s3_key=s3_key,
            content_type=content_type,
            is_temp=False
        )

        if not uploaded_key:
            raise HTTPException(status_code=500, detail="Failed to upload file to S3")

        logger.info(f"Annotation file {file.filename} uploaded to S3: {s3_key}")

        file_url = f"/uploads/{s3_key}"

        return JSONResponse(
            status_code=200,
            content={
                "message": "File uploaded successfully",
                "url": file_url,
                "filename": file.filename,
                "s3_key": s3_key
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file {file.filename if file else 'unknown'}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to upload file.")


@router.get("/uploads/{path:path}")
async def stream_file(path: str):
    """
    Stream file from S3 through the API.
    Maintains backward compatibility with frontend URLs like /uploads/videos/...
    """
    try:
        s3_key = path
        file_stream = await s3_service.get_file_stream(s3_key)

        if file_stream is None:
            raise HTTPException(status_code=404, detail="File not found")

        content_type = mimetypes.guess_type(path)[0] or "application/octet-stream"

        return StreamingResponse(
            file_stream.iter_chunks(chunk_size=65536),
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=3600",
                "Accept-Ranges": "bytes"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error streaming file {path}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to stream file.")
