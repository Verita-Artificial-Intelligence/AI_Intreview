from fastapi import APIRouter, File, UploadFile, Form, Query, Body, HTTPException
from typing import List, Optional
from models import Interview, InterviewCreate
from models.annotation import AnnotationTask
from services import InterviewService
from services.resume_service import ResumeService
from services.annotation_service import AnnotationService
import logging
import os
import subprocess
from datetime import datetime, timedelta
from pathlib import Path

import aiofiles
from database import get_interviews_collection, get_candidates_collection, db

router = APIRouter()
logger = logging.getLogger(__name__)

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads/videos")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("", response_model=Interview)
async def create_interview(interview_data: InterviewCreate):
    """Create a new interview"""
    return await InterviewService.create_interview(interview_data)


@router.get("", response_model=List[Interview])
async def get_interviews(
    candidate_id: Optional[str] = Query(None, description="Filter by candidate ID"),
    job_id: Optional[str] = Query(None, description="Filter by job ID")
):
    """Get all interviews with optional filtering by candidate_id and/or job_id"""
    return await InterviewService.get_interviews(candidate_id=candidate_id, job_id=job_id)


@router.get("/{interview_id}", response_model=Interview)
async def get_interview(interview_id: str):
    """Get a specific interview by ID"""
    return await InterviewService.get_interview(interview_id)


@router.delete("/{interview_id}")
async def delete_interview(interview_id: str):
    """Delete an interview"""
    try:
        await db.interviews.delete_one({"id": interview_id})
        return {"success": True, "message": "Interview deleted successfully"}
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

        # Update acceptance status
        interviews_collection = get_interviews_collection()
        result = await interviews_collection.update_one(
            {"id": interview_id},
            {"$set": {"acceptance_status": "accepted"}}
        )

        if result.modified_count == 0:
            logger.warning(f"Interview {interview_id} acceptance_status not updated")

        logger.info(f"Accepted candidate {interview.candidate_id} for interview {interview_id}")

        # Return updated interview
        updated_interview = await InterviewService.get_interview(interview_id)
        return {
            "success": True,
            "message": "Candidate accepted. You can now create annotation tasks for them.",
            "interview": updated_interview.model_dump()
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

        # Update acceptance status
        interviews_collection = get_interviews_collection()
        result = await interviews_collection.update_one(
            {"id": interview_id},
            {"$set": {"acceptance_status": "rejected"}}
        )

        if result.modified_count == 0:
            return {"success": False, "error": "Failed to update interview"}

        logger.info(f"Rejected candidate {interview.candidate_id} for interview {interview_id}")

        # Return updated interview
        updated_interview = await InterviewService.get_interview(interview_id)
        return {
            "success": True,
            "message": "Candidate rejected",
            "interview": updated_interview.model_dump()
        }

    except Exception as e:
        logger.error(f"Error rejecting candidate: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


@router.patch("/{interview_id}/resume")
async def update_interview_resume(interview_id: str, data: dict = Body(...)):
    """Update interview with candidate's resume text"""
    try:
        resume_text = data.get("resume_text", "")
        if not resume_text:
            return {"success": False, "error": "Resume text is required"}

        interviews_collection = get_interviews_collection()
        result = await interviews_collection.update_one(
            {"id": interview_id},
            {"$set": {"resume_text": resume_text}}
        )

        if result.modified_count == 0:
            return {"success": False, "error": "Interview not found or no update needed"}

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
        raise HTTPException(status_code=404, detail="Interview has no transcript data")

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

        messages.append({
            "role": entry.get("speaker", "user"),
            "content": entry.get("text", ""),
            "timestamp": timestamp
        })

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
                "error": "Failed to extract text from resume. Please check the file format and try again."
            }

        # Sanitize and truncate if needed
        sanitized_text = ResumeService.sanitize_resume_text(resume_text)

        return {
            "success": True,
            "resume_text": sanitized_text,
            "filename": resume.filename,
            "length": len(sanitized_text)
        }

    except Exception as e:
        logger.error(f"Error processing resume upload: {e}", exc_info=True)
        return {
            "success": False,
            "error": "An unexpected error occurred while processing the resume."
        }


@router.post("/upload/video")
async def upload_interview_video(
    video: UploadFile = File(...),
    session_id: str = Form(...),
    interview_id: Optional[str] = Form(None),
):
    """Upload interview video recording and combine with server-mixed audio"""
    try:
        # Generate temporary video filename (video-only)
        temp_video_filename = f"{session_id}_video_only.webm"
        if interview_id:
            temp_video_filename = f"{interview_id}_{session_id}_video_only.webm"

        temp_video_path = UPLOAD_DIR / temp_video_filename

        # Save video-only file temporarily
        async with aiofiles.open(temp_video_path, "wb") as f:
            content = await video.read()
            await f.write(content)

        logger.info(f"Video uploaded: {temp_video_filename} ({len(content)} bytes)")

        # Wait for mixed audio to be ready (with timeout)
        audio_path = None
        if interview_id:
            import asyncio
            interviews_collection = get_interviews_collection()

            # Poll for audio path for up to 10 seconds
            max_attempts = 20
            attempt = 0
            while attempt < max_attempts:
                interview_doc = await interviews_collection.find_one({"id": interview_id})
                if interview_doc:
                    audio_path = interview_doc.get("audio_path")
                    if audio_path and Path(audio_path).exists():
                        logger.info(f"Mixed audio found: {audio_path}")
                        break

                attempt += 1
                if attempt < max_attempts:
                    logger.info(f"Waiting for mixed audio... attempt {attempt}/{max_attempts}")
                    await asyncio.sleep(0.5)

            if not audio_path:
                logger.warning(f"Mixed audio not ready after {max_attempts * 0.5}s, proceeding with video-only")

        # If mixed audio exists, combine it with video
        final_filename = f"{session_id}.mp4"
        if interview_id:
            final_filename = f"{interview_id}_{session_id}.mp4"

        final_video_path = UPLOAD_DIR / final_filename

        combine_succeeded = False
        if audio_path and Path(audio_path).exists():
            logger.info(f"Combining video with mixed audio: {audio_path}")
            success = await combine_video_and_audio(temp_video_path, Path(audio_path), final_video_path)

            if success:
                # Remove temporary video-only file
                temp_video_path.unlink(missing_ok=True)
                logger.info(f"Final video with audio created: {final_filename}")
                combine_succeeded = True
            else:
                # If combining failed, keep video-only file as fallback
                logger.warning("Failed to combine audio, using video-only file")
                final_video_path = temp_video_path
                final_filename = temp_video_filename
                combine_succeeded = False
        else:
            # No audio available, rename video-only file as final
            logger.warning(f"No mixed audio found for interview {interview_id}, saving video-only")
            temp_video_path.rename(final_video_path)
            combine_succeeded = False

        # Update interview with video URL if interview_id provided
        if interview_id:
            interviews_collection = get_interviews_collection()
            video_url = f"/uploads/videos/{final_filename}"

            if not combine_succeeded:
                existing = await interviews_collection.find_one(
                    {"id": interview_id}, {"_id": 0, "video_url": 1}
                )
                if existing and existing.get("video_url") and existing["video_url"].endswith(".mp4"):
                    logger.info(
                        "Skipping video_url update because existing MP4 should be retained: %s",
                        existing["video_url"],
                    )
                    return {
                        "success": True,
                        "filename": final_filename,
                        "size": len(content),
                        "path": str(final_video_path),
                    }

            await interviews_collection.update_one(
                {"id": interview_id},
                {"$set": {"video_url": video_url}}
            )
            logger.info(f"Updated interview {interview_id} with video_url: {video_url}")

        return {
            "success": True,
            "filename": final_filename,
            "size": len(content),
            "path": str(final_video_path),
        }

    except Exception as e:
        logger.error(f"Error uploading video: {e}")
        return {"success": False, "error": str(e)}


async def combine_video_and_audio(video_path: Path, audio_path: Path, output_path: Path) -> bool:
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
            "-i", str(video_path),
            "-i", str(audio_path),
            "-map", "0:v:0",  # use video from original recording
            "-map", "1:a:0",  # replace audio with mixed track
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "20",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            str(output_path),
        ]

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
        logger.error("FFmpeg executable not found. Ensure ffmpeg is installed and in PATH.")
        return False
    except RuntimeError as e:
        logger.warning(f"FFmpeg failed to merge audio with video: {e}")
        return False
    except Exception as e:
        logger.error(f"Error combining video and audio: {e}", exc_info=True)
        return False
