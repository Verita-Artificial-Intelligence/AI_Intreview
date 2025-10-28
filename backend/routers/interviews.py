import asyncio
from fastapi import APIRouter, File, UploadFile, Form, Query, Body, HTTPException
from typing import List, Optional
from models import Interview, InterviewCreate, InterviewUpdate
from models.annotation import AnnotationTask
from services import InterviewService
from services.resume_service import ResumeService
from services.annotation_service import AnnotationService
from services.s3_service import s3_service
import logging
import os
import subprocess
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

import aiofiles
from database import db

router = APIRouter()
logger = logging.getLogger(__name__)

FFMPEG_VIDEO_PRESET = os.getenv("FFMPEG_VIDEO_PRESET", "veryfast")
FFMPEG_CRF = os.getenv("FFMPEG_CRF", "23")
FFMPEG_AUDIO_BITRATE = os.getenv("FFMPEG_AUDIO_BITRATE", "96k")
FFMPEG_THREAD_OVERRIDE = os.getenv("FFMPEG_THREADS")


@router.post("", response_model=Interview)
async def create_interview(interview_data: InterviewCreate):
    """Create a new interview"""
    return await InterviewService.create_interview(interview_data)


@router.get("", response_model=List[Interview])
async def get_interviews(
    candidate_id: Optional[str] = Query(None, description="Filter by candidate ID"),
    job_id: Optional[str] = Query(None, description="Filter by job ID"),
):
    """Get all interviews with optional filtering by candidate_id and/or job_id"""
    return await InterviewService.get_interviews(
        candidate_id=candidate_id, job_id=job_id
    )


@router.get("/{interview_id}", response_model=Interview)
async def get_interview(interview_id: str):
    """Get a specific interview by ID"""
    return await InterviewService.get_interview(interview_id)


@router.patch("/{interview_id}", response_model=Interview)
async def update_interview(interview_id: str, update_data: InterviewUpdate):
    """
    Update interview fields.
    Supports partial updates - only provided fields will be updated.
    """
    try:
        return await InterviewService.update_interview(
            interview_id, update_data.model_dump(exclude_unset=True)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating interview: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{interview_id}")
async def delete_interview(interview_id: str):
    """Delete an interview"""
    try:
        return await InterviewService.delete_interview(interview_id)
    except Exception as e:
        logger.error(f"Error deleting interview: {e}")
        return {"success": False, "error": str(e)}


@router.patch("/{interview_id}/accept")
async def accept_candidate(interview_id: str):
    """
    Accept a candidate for annotation work.
    This updates the interview's acceptance_status to 'accepted'.

    Note: Annotation tasks should be created manually through the admin UI
    after accepting a candidate. This allows for more control over task
    assignment and metadata (task name, description, instructions).
    """
    try:
        # Get the interview
        interview = await InterviewService.get_interview(interview_id)
        if not interview:
            return {"success": False, "error": "Interview not found"}

        logger.info(
            f"Accepted candidate {interview.candidate_id} for interview {interview_id}"
        )

        # Update acceptance status
        updated_interview = await InterviewService.update_acceptance_status(
            interview_id, "accepted"
        )

        return {
            "success": True,
            "message": "Candidate accepted. You can now create annotation tasks for them.",
            "interview": updated_interview.model_dump(),
        }

    except Exception as e:
        logger.error(f"Error accepting candidate: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


@router.patch("/{interview_id}/reject")
async def reject_candidate(interview_id: str):
    """
    Reject a candidate.
    This will update the interview's acceptance_status to 'rejected'
    """
    try:
        # Get the interview
        interview = await InterviewService.get_interview(interview_id)
        if not interview:
            return {"success": False, "error": "Interview not found"}

        logger.info(
            f"Rejected candidate {interview.candidate_id} for interview {interview_id}"
        )

        # Update acceptance status
        updated_interview = await InterviewService.update_acceptance_status(
            interview_id, "rejected"
        )

        return {
            "success": True,
            "message": "Candidate rejected",
            "interview": updated_interview.model_dump(),
        }

    except Exception as e:
        logger.error(f"Error rejecting candidate: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


@router.post("/{interview_id}/retry-scoring")
async def retry_scoring(interview_id: str):
    """
    Retry AI scoring/analysis for an interview.
    Useful when analysis failed or needs to be re-run.
    """
    try:
        # Get the interview
        interview = await InterviewService.get_interview(interview_id)
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")

        # Check if interview has transcript
        if not interview.transcript or len(interview.transcript) < 2:
            raise HTTPException(
                status_code=400,
                detail="Interview does not have sufficient transcript data for analysis",
            )

        logger.info(f"Retrying analysis for interview {interview_id}")

        # Trigger re-analysis
        analysis_result = await InterviewService.analyze_interview(interview_id)

        # Get updated interview
        updated_interview = await InterviewService.get_interview(interview_id)

        return {
            "success": True,
            "message": "Analysis completed successfully",
            "interview": updated_interview.model_dump(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrying analysis: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to retry analysis: {str(e)}"
        )


@router.patch("/{interview_id}/resume")
async def update_interview_resume(interview_id: str, data: dict = Body(...)):
    """Update interview with candidate's resume text"""
    try:
        resume_text = data.get("resume_text", "")
        if not resume_text:
            return {"success": False, "error": "Resume text is required"}

        interviews_collection = get_interviews_collection()
        result = await interviews_collection.update_one(
            {"id": interview_id}, {"$set": {"resume_text": resume_text}}
        )

        if result.modified_count == 0:
            return {
                "success": False,
                "error": "Interview not found or no update needed",
            }

        logger.info(f"Updated interview {interview_id} with resume text")
        return {"success": True, "message": "Resume updated successfully"}
    except Exception as e:
        logger.error(f"Error updating resume: {e}")
        return {"success": False, "error": str(e)}


@router.post("/{interview_id}/complete")
async def complete_interview(interview_id: str):
    """Mark interview as completed and generate summary"""
    return await InterviewService.complete_interview(interview_id)


@router.get("/{interview_id}/messages")
async def get_interview_messages(interview_id: str):
    """Get interview transcript as messages"""
    interview = await InterviewService.get_interview(interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if not interview.transcript:
        logger.warning(f"Interview {interview_id} has no transcript data")
        raise HTTPException(status_code=404, detail="Interview has no transcript data")

    # Log transcript details for debugging
    user_entries = [
        entry for entry in interview.transcript if entry.get("speaker") == "user"
    ]
    ai_entries = [
        entry for entry in interview.transcript if entry.get("speaker") == "assistant"
    ]
    logger.info(
        f"📋 Retrieving transcript for interview {interview_id}: {len(interview.transcript)} total entries ({len(user_entries)} user, {len(ai_entries)} AI)"
    )

    # Convert transcript format: {speaker: "user"/"assistant", text: "...", timestamp: ...}
    # to message format: {role: "user"/"assistant", content: "...", timestamp: ...}
    messages = []
    for i, entry in enumerate(interview.transcript):
        # Use entry timestamp if available, otherwise increment from created_at
        if "timestamp" in entry and entry["timestamp"]:
            timestamp = entry["timestamp"]
        else:
            # Increment by 1 second for each message
            timestamp = (interview.created_at + timedelta(seconds=i)).isoformat()

        messages.append(
            {
                "role": entry.get("speaker", "user"),
                "content": entry.get("text", ""),
                "timestamp": timestamp,
            }
        )

    return messages


@router.post("/{interview_id}/analyze")
async def analyze_interview(interview_id: str, framework: str = Query("behavioral")):
    """Generate AI analysis of interview"""
    try:
        analysis = await InterviewService.analyze_interview(interview_id, framework)
        return analysis
    except HTTPException:
        # Re-raise HTTPExceptions (404, 500, etc.) as-is
        raise
    except Exception as e:
        logger.error(f"Error analyzing interview: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/upload/resume")
async def upload_resume(resume: UploadFile = File(...)):
    """
    Upload and extract text from a resume file.
    Supports PDF, TXT, DOC, and DOCX formats.
    Returns extracted text that can be used when creating an interview.
    """
    try:
        # Extract text from resume
        resume_text = await ResumeService.extract_text_from_upload(resume)

        if not resume_text:
            return {
                "success": False,
                "error": "Failed to extract text from resume. Please check the file format and try again.",
            }

        # Sanitize and truncate if needed
        sanitized_text = ResumeService.sanitize_resume_text(resume_text)

        return {
            "success": True,
            "resume_text": sanitized_text,
            "filename": resume.filename,
            "length": len(sanitized_text),
        }

    except Exception as e:
        logger.error(f"Error processing resume upload: {e}", exc_info=True)
        return {
            "success": False,
            "error": "An unexpected error occurred while processing the resume.",
        }


@router.post("/upload/video")
async def upload_interview_video(
    video: UploadFile = File(...),
    session_id: str = Form(...),
    interview_id: Optional[str] = Form(None),
):
    """Upload interview video recording and combine with server-mixed audio from S3"""
    try:
        video_content = await video.read()
        logger.info(f"Video uploaded: {session_id} ({len(video_content)} bytes)")

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            temp_video_filename = f"{session_id}_video_only.webm"
            if interview_id:
                temp_video_filename = f"{interview_id}_{session_id}_video_only.webm"

            temp_video_path = temp_path / temp_video_filename

            with open(temp_video_path, "wb") as f:
                f.write(video_content)

            audio_s3_key = None
            audio_local_path = None
            interviews_collection = None
            if interview_id:
                interviews_collection = get_interviews_collection()
                max_attempts = 20
                attempt = 0
                while attempt < max_attempts:
                    interview_doc = await interviews_collection.find_one(
                        {"id": interview_id}
                    )
                    if interview_doc:
                        audio_s3_key = interview_doc.get("audio_path")
                        if audio_s3_key:
                            logger.info(f"Mixed audio S3 key found: {audio_s3_key}")
                            audio_local_path = temp_path / "mixed_audio.wav"
                            success = await s3_service.download_file_to_path(
                                audio_s3_key, audio_local_path
                            )
                            if success:
                                logger.info(
                                    f"Mixed audio downloaded from S3 to: {audio_local_path}"
                                )
                                break
                            else:
                                logger.warning(
                                    f"Failed to download audio from S3: {audio_s3_key}"
                                )
                                audio_s3_key = None

                    attempt += 1
                    if attempt < max_attempts:
                        logger.info(
                            f"Waiting for mixed audio... attempt {attempt}/{max_attempts}"
                        )
                        await asyncio.sleep(0.5)

                if not audio_s3_key:
                    logger.warning(
                        f"Mixed audio not ready after {max_attempts * 0.5}s, proceeding with video-only"
                    )

            # If mixed audio exists, combine it with video
            final_filename = f"{session_id}.mp4"
            if interview_id:
                final_filename = f"{interview_id}_{session_id}.mp4"

            final_video_path = temp_path / final_filename
            combine_succeeded = False

            if audio_local_path and audio_local_path.exists():
                logger.info(f"Combining video with mixed audio: {audio_local_path}")
                success = await combine_video_and_audio(
                    temp_video_path,
                    audio_local_path,
                    final_video_path,
                )

                if success:
                    logger.info(f"Final video with audio created: {final_filename}")
                    combine_succeeded = True
                else:
                    logger.warning("Failed to combine audio, using video-only file")
                    final_video_path = temp_video_path
                    final_filename = temp_video_filename
                    combine_succeeded = False
            else:
                # No audio available, use video-only file as final
                logger.warning(
                    f"No mixed audio found for interview {interview_id}, saving video-only"
                )
                final_video_path = temp_video_path
                final_filename = temp_video_filename
                combine_succeeded = False

            s3_key = s3_service.generate_s3_key(
                f"videos/{interview_id if interview_id else session_id}", final_filename
            )
            with open(final_video_path, "rb") as f:
                final_content = f.read()
                uploaded_key = await s3_service.upload_file(
                    file_content=final_content,
                    s3_key=s3_key,
                    content_type=(
                        "video/mp4" if final_filename.endswith(".mp4") else "video/webm"
                    ),
                    is_temp=False,
                )

            if not uploaded_key:
                raise HTTPException(
                    status_code=500, detail="Failed to upload video to S3"
                )

            logger.info(f"Video uploaded to S3: {uploaded_key}")

            # Temp files automatically cleaned up when exiting context manager

        if interview_id:
            interviews_collection = get_interviews_collection()
            video_url = f"/uploads/{s3_key}"

            if not combine_succeeded:
                existing = await interviews_collection.find_one(
                    {"id": interview_id}, {"_id": 0, "video_url": 1}
                )
                if (
                    existing
                    and existing.get("video_url")
                    and ".mp4" in existing["video_url"]
                ):
                    logger.info(
                        "Skipping video_url update because existing MP4 should be retained: %s",
                        existing["video_url"],
                    )
                    return {
                        "success": True,
                        "filename": final_filename,
                        "size": len(video_content),
                        "s3_key": s3_key,
                        "url": video_url,
                    }

            await interviews_collection.update_one(
                {"id": interview_id},
                {"$set": {"video_url": s3_key, "video_processing_status": "completed"}},
            )
            logger.info(f"Updated interview {interview_id} with video S3 key: {s3_key}")

        return {
            "success": True,
            "filename": final_filename,
            "size": len(video_content),
            "s3_key": s3_key,
            "url": f"/uploads/{s3_key}",
        }

    except Exception as e:
        logger.error(f"Error uploading video: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


async def combine_video_and_audio(
    video_path: Path, audio_path: Path, output_path: Path
) -> bool:
    """
    Combine video-only file with mixed audio file using MoviePy.

    Args:
        video_path: Path to video-only file (WebM)
        audio_path: Path to mixed audio file (WAV)
        output_path: Path to output file (MP4)

    Returns:
        True if successful, False otherwise
    """
    try:
        if not video_path.exists():
            logger.warning(f"Video source missing while combining audio: {video_path}")
            return False

        size = video_path.stat().st_size
        if size <= 0:
            logger.warning(f"Video source empty while combining audio: {video_path}")
            return False
    except Exception as e:
        logger.warning(f"Unable to validate uploaded video before mixing: {e}")
        return False

    try:
        import asyncio
        import subprocess

        ffmpeg_cmd = [
            "ffmpeg",
            "-y",  # overwrite output
            "-i",
            str(video_path),
            "-i",
            str(audio_path),
            "-map",
            "0:v:0",  # use video from original recording
            "-map",
            "1:a:0",  # replace audio with mixed track
            "-c:v",
            "libx264",
            "-preset",
            FFMPEG_VIDEO_PRESET,
            "-crf",
            FFMPEG_CRF,
            "-c:a",
            "aac",
            "-b:a",
            FFMPEG_AUDIO_BITRATE,
            "-movflags",
            "+faststart",
            "-pix_fmt",
            "yuv420p",
        ]

        if FFMPEG_THREAD_OVERRIDE:
            ffmpeg_cmd.extend(["-threads", FFMPEG_THREAD_OVERRIDE])

        ffmpeg_cmd.append(str(output_path))

        def _run_ffmpeg():
            result = subprocess.run(
                ffmpeg_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            if result.returncode != 0:
                raise RuntimeError(result.stderr)
            return True

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _run_ffmpeg)

        logger.info(f"Video and audio combined successfully: {output_path}")
        return True

    except FileNotFoundError:
        logger.error(
            "FFmpeg executable not found. Ensure ffmpeg is installed and in PATH."
        )
        return False
    except RuntimeError as e:
        logger.warning(f"FFmpeg failed to merge audio with video: {e}")
        return False
    except Exception as e:
        logger.error(f"Error combining video and audio: {e}", exc_info=True)
        return False
