from fastapi import APIRouter, File, UploadFile, Form, Query
from typing import List, Optional
from models import Interview, InterviewCreate
from services import InterviewService, AnalysisService
import logging
import aiofiles
from pathlib import Path
import os
from database import get_interviews_collection, get_candidates_collection
from datetime import datetime

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


@router.get("/{interview_id}/messages")
async def get_interview_messages(interview_id: str):
    """Get interview transcript as messages"""
    interview = await InterviewService.get_interview(interview_id)
    if not interview or not interview.transcript:
        return []

    # Convert transcript format: {speaker: "user"/"assistant", text: "..."}
    # to message format: {role: "user"/"assistant", content: "...", timestamp: ...}
    messages = []
    for i, entry in enumerate(interview.transcript):
        messages.append({
            "role": entry.get("speaker", "user"),
            "content": entry.get("text", ""),
            "timestamp": interview.created_at.isoformat() if i == 0 else interview.created_at.isoformat()
        })

    return messages


@router.post("/{interview_id}/analyze")
async def analyze_interview(interview_id: str, framework: str = Query("behavioral")):
    """Generate AI analysis of interview"""
    try:
        analysis = await InterviewService.analyze_interview(interview_id, framework)
        return analysis
    except Exception as e:
        logger.error(f"Error analyzing interview: {e}")
        return {"error": str(e)}


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

        if audio_path and Path(audio_path).exists():
            logger.info(f"Combining video with mixed audio: {audio_path}")
            success = await combine_video_and_audio(temp_video_path, Path(audio_path), final_video_path)

            if success:
                # Remove temporary video-only file
                temp_video_path.unlink(missing_ok=True)
                logger.info(f"Final video with audio created: {final_filename}")
            else:
                # If combining failed, keep video-only file as fallback
                logger.warning("Failed to combine audio, using video-only file")
                final_video_path = temp_video_path
                final_filename = temp_video_filename
        else:
            # No audio available, rename video-only file as final
            logger.warning(f"No mixed audio found for interview {interview_id}, saving video-only")
            temp_video_path.rename(final_video_path)

        # Update interview with video URL if interview_id provided
        if interview_id:
            interviews_collection = get_interviews_collection()
            video_url = f"/uploads/videos/{final_filename}"
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
        from moviepy.editor import VideoFileClip, AudioFileClip
        import asyncio

        # MoviePy is synchronous, run in thread pool to avoid blocking
        def _combine():
            # Load video and audio
            video = VideoFileClip(str(video_path))
            audio = AudioFileClip(str(audio_path))

            # Set audio on video
            video_with_audio = video.set_audio(audio)

            # Write output as MP4 with H.264/AAC for web compatibility
            video_with_audio.write_videofile(
                str(output_path),
                codec='libx264',  # H.264 video codec (universal browser support)
                audio_codec='aac',  # AAC audio codec (universal browser support)
                audio_bitrate='128k',
                preset='medium',  # Balance between speed and quality
                ffmpeg_params=['-movflags', '+faststart'],  # Enable streaming/progressive download
                logger=None  # Suppress MoviePy logs
            )

            # Close clips to free resources
            video_with_audio.close()
            video.close()
            audio.close()

            return True

        # Run in thread pool to avoid blocking event loop
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, _combine)

        logger.info(f"Video and audio combined successfully: {output_path}")
        return result

    except FileNotFoundError:
        logger.error("FFmpeg not found. MoviePy requires FFmpeg to be installed.")
        return False
    except Exception as e:
        logger.error(f"Error combining video and audio: {e}", exc_info=True)
        return False
