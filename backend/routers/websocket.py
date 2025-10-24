"""
Simple bidirectional proxy between client and OpenAI Realtime API.

Client ↔ Backend ↔ OpenAI
"""

import asyncio
import base64
import json
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from uuid import uuid4

from config import settings
from services.realtime_service import RealtimeService
from services.audio_buffer import AudioBuffer
from services.audio_mixer import AudioMixer
from services.speech_activity import SpeechActivityMonitor
from database import get_interviews_collection
from prompts.chat import get_interviewer_system_prompt
from pathlib import Path
from websockets.exceptions import ConnectionClosed, ConnectionClosedError, ConnectionClosedOK

logger = logging.getLogger(__name__)

router = APIRouter()


def _merge_transcript_chunk(
    transcript: list[dict],
    speaker: str,
    text: str,
    *,
    final: bool = False,
    replace_on_final: bool = False,
) -> bool:
    """
    Append or update a transcript entry in-place.

    Args:
        transcript: Mutable transcript list.
        speaker: Either 'user' or 'assistant'.
        text: The text chunk to merge.
        final: True when this chunk represents the final transcript for the turn.
        replace_on_final: When True, final chunks overwrite the existing text for the
            speaker's current turn instead of appending a new entry.

    Returns:
        bool: True when transcript was updated; False when input text was empty.
    """
    if not text:
        logger.debug(f"🚫 Skipping empty transcript chunk for {speaker}")
        return False
    
    logger.debug(f"📝 Merging transcript chunk: speaker={speaker}, final={final}, replace_on_final={replace_on_final}, text='{text[:50]}{'...' if len(text) > 50 else ''}'")
    
    before_count = len(transcript)

    if transcript and transcript[-1].get("speaker") == speaker:
        current_text = transcript[-1].get("text", "")

        # Smart handling for final events:
        # If final text is substantially similar to current (delta-built) text, replace it.
        # Otherwise, this is likely a new turn from same speaker, so don't merge.
        if final and replace_on_final:
            # Check if current text is a prefix of final text (deltas were building up)
            if current_text and text.startswith(current_text.strip()):
                # Delta→final flow: replace accumulated deltas with authoritative final
                transcript[-1]["text"] = text
            elif current_text == text:
                # Duplicate final event: just replace
                transcript[-1]["text"] = text
            elif len(current_text) > 0 and len(text) > 10:
                # Different substantial text from same speaker = likely new turn
                # Create new entry instead of replacing
                import time
                transcript.append({
                    "speaker": speaker, 
                    "text": text,
                    "timestamp": time.time()
                })
            else:
                # Default: replace as originally intended
                transcript[-1]["text"] = text
        else:
            # Non-final or no replace: append
            transcript[-1]["text"] += text
    else:
        # Add timestamp when creating new entry
        import time
        transcript.append({
            "speaker": speaker, 
            "text": text,
            "timestamp": time.time()
        })

    after_count = len(transcript)
    logger.debug(f"✅ Transcript updated: {before_count} -> {after_count} entries, last entry: {transcript[-1] if transcript else 'none'}")
    
    return True


@router.websocket("/session")
async def websocket_endpoint(websocket: WebSocket):
    """
    Bidirectional proxy for OpenAI Realtime API.

    Flow:
    1. Client connects and sends session start with optional interview_id
    2. Backend fetches interview context (if provided)
    3. Backend creates OpenAI connection with interview-specific instructions
    4. Backend proxies all messages bidirectionally
    """
    await websocket.accept()
    logger.info("Client connected")

    realtime: Optional[RealtimeService] = None
    session_id: Optional[str] = None
    openai_task: Optional[asyncio.Task] = None
    client_proxy_task: Optional[asyncio.Task] = None
    transcript: list[dict] = []
    interview_id: Optional[str] = None
    can_persist: bool = True
    audio_buffer: Optional[AudioBuffer] = None

    try:
        # Wait for initial start message from client with timeout
        try:
            start_msg = await asyncio.wait_for(websocket.receive_text(), timeout=15)
        except asyncio.TimeoutError:
            await websocket.send_json({
                "event": "error",
                "message": "Session start timed out. Please retry."
            })
            return
        data = json.loads(start_msg)

        if data.get("event") != "start":
            await websocket.send_json({
                "event": "error",
                "message": "First message must be 'start' event"
            })
            return

        session_id = data.get("session_id") or str(uuid4())
        interview_id = data.get("interview_id")
        job_id = data.get("job_id")
        candidate_id = data.get("candidate_id")
        candidate_name = data.get("candidate_name")

        if not candidate_id:
            logger.warning(f"Starting session {session_id} WITHOUT candidate_id - interview will have null candidate_id!")

        logger.info(f"Starting session: {session_id} for candidate: {candidate_name} ({candidate_id})")

        # Initialize audio buffer for server-side mixing
        audio_buffer = AudioBuffer(sample_rate=24000, channels=1)

        # Pre-check interview state to guide flow and persistence
        if interview_id:
            try:
                from database import get_jobs_collection
                interviews_collection = get_interviews_collection()
                interview_doc = await interviews_collection.find_one({"id": interview_id})

                if not interview_doc:
                    if candidate_id and job_id:
                        existing_for_job = await interviews_collection.find_one({
                            "candidate_id": candidate_id,
                            "job_id": job_id,
                            "status": {"$in": ["in_progress", "completed", "under_review", "approved"]},
                        })

                        if existing_for_job:
                            await websocket.send_json({
                                "event": "error",
                                "message": "You have already completed this interview. Please review your application status instead of starting a new one.",
                            })
                            await websocket.close(code=1008, reason="duplicate-completed-interview")
                            return

                    # Create new interview document
                    from datetime import datetime, timezone
                    interview_doc = {
                        "id": interview_id,
                        "status": "in_progress",
                        "created_at": datetime.now(timezone.utc),
                        "transcript": [],
                        "acceptance_status": "pending",  # Set default acceptance status
                        "candidate_id": candidate_id,
                        "candidate_name": candidate_name or "Unknown"
                    }

                    # Add job information if job_id provided
                    if job_id:
                        jobs_collection = get_jobs_collection()
                        job = await jobs_collection.find_one({"id": job_id}, {"_id": 0})
                        if job:
                            interview_doc["job_id"] = job_id
                            interview_doc["job_title"] = job.get("title")
                            interview_doc["position"] = job.get("title")
                            # Set interview configuration from job
                            interview_doc["interview_type"] = job.get("interview_type") or "standard"
                            interview_doc["skills"] = job.get("skills") or None
                            interview_doc["custom_questions"] = job.get("custom_questions") or None
                            interview_doc["custom_exercise_prompt"] = job.get("custom_exercise_prompt") or None
                            logger.info(f"Loaded job config: type={job.get('interview_type', 'standard')}, custom_questions={len(job.get('custom_questions') or [])}, skills={len(job.get('skills') or [])}")

                    await interviews_collection.insert_one(interview_doc)
                    logger.info(f"Created new interview document: {interview_id} for candidate {candidate_name} ({candidate_id}) with acceptance_status: pending")
                else:
                    # Interview already exists - check if it's completed
                    if interview_doc.get("status") == "completed":
                        await websocket.send_json({
                            "event": "notice",
                            "msg": "Interview already completed. Starting a practice session; results won't be saved.",
                        })
                        can_persist = False
            except Exception as e:
                logger.error(f"Error checking/creating interview: {e}")
                # If pre-check fails, proceed with defaults and avoid persistence
                can_persist = False

        # Get interview-specific instructions
        instructions = await get_interview_instructions(interview_id)

        # Create OpenAI connection
        realtime = RealtimeService(
            api_key=settings.OPENAI_API_KEY,
            model=settings.OPENAI_REALTIME_MODEL,
            voice=settings.OPENAI_REALTIME_VOICE,
            instructions=instructions,
            silence_duration_ms=settings.OPENAI_REALTIME_SILENCE_DURATION_MS,
            max_silence_duration_ms=settings.OPENAI_REALTIME_SILENCE_DURATION_MAX_MS,
            silence_duration_step_ms=settings.OPENAI_REALTIME_SILENCE_DURATION_STEP_MS,
        )

        await realtime.connect()

        # Notify client session is ready
        await websocket.send_json({
            "event": "session_ready",
            "session_id": session_id,
        })

        logger.info(f"Session ready: {session_id}")

        # Seed initial turn so the model starts proactively
        await realtime.send_event({
            "type": "conversation.item.create",
            "item": {
                "type": "message",
                "role": "user",
                "content": [
                    { "type": "input_text", "text": "Please begin the interview with a brief greeting and the first creative-focused question." }
                ]
            }
        })
        await realtime.send_event({"type": "response.create"})
        logger.info("Seeded message item and sent response.create to AI")

        # Start bidirectional forwarding with audio buffering
        openai_task = asyncio.create_task(
            forward_openai_to_client(realtime, websocket, transcript, audio_buffer)
        )
        client_proxy_task = asyncio.create_task(
            forward_client_to_openai(websocket, realtime, audio_buffer)
        )

        await asyncio.gather(openai_task, client_proxy_task)

    except WebSocketDisconnect:
        logger.info(f"Client disconnected: {session_id}")

    except Exception as e:
        logger.error(f"Session error: {e}", exc_info=True)
        try:
            await websocket.send_json({
                "event": "error",
                "message": str(e)
            })
        except:
            pass

    finally:
        # Cleanup
        if openai_task:
            openai_task.cancel()
        if client_proxy_task:
            client_proxy_task.cancel()
        # Await task cancellation to avoid hanging during reload
        tasks = [t for t in (openai_task, client_proxy_task) if t]
        if tasks:
            try:
                await asyncio.gather(*tasks, return_exceptions=True)
            except Exception:
                pass

        if realtime:
            await realtime.close()

        # Wait a moment for any pending transcription events after session end
        if transcript and len([e for e in transcript if e.get("speaker") == "user"]) == 0:
            logger.info("⏳ No user transcripts yet - waiting briefly for pending transcription events...")
            try:
                # Wait up to 2 seconds for any pending transcription events
                wait_start = asyncio.get_event_loop().time()
                while (asyncio.get_event_loop().time() - wait_start) < 2.0:
                    try:
                        event = await asyncio.wait_for(realtime._event_queue.get(), timeout=0.1)
                        event_type = event.get("type", "")
                        logger.info(f"📥 Late event: {event_type}")
                        
                        # Process any user transcription events that come in
                        if "input_audio_transcription" in event_type or ("conversation.item.done" in event_type and 
                            event.get("item", {}).get("type") == "input_audio_transcription"):
                            transcript_text = event.get("transcript", "") or event.get("item", {}).get("transcript", "")
                            if transcript_text and _merge_transcript_chunk(transcript, "user", transcript_text, final=True):
                                logger.info(f"📝 Late user transcript captured: '{transcript_text[:50]}...'")
                        
                    except asyncio.TimeoutError:
                        continue
                    except Exception as e:
                        logger.debug(f"Error processing late events: {e}")
                        break
            except Exception as e:
                logger.debug(f"Error waiting for late transcription events: {e}")

        # Fallback: If we still have no user transcripts but we have mic audio, try local transcription
        user_entries = [entry for entry in transcript if entry.get("speaker") == "user"]
        if len(user_entries) == 0:
            logger.warning("⚠️ No user transcripts received from OpenAI - check if audio was properly committed")

        # Save mixed audio and transcript
        logger.info(f"Session ending - can_persist={can_persist}, interview_id={interview_id}, transcript_length={len(transcript) if transcript else 0}")

        if can_persist and interview_id is not None:
            if transcript:
                # Log transcript details for debugging
                user_entries = [entry for entry in transcript if entry.get("speaker") == "user"]
                ai_entries = [entry for entry in transcript if entry.get("speaker") == "assistant"]
                logger.info(f"💾 Saving transcript with {len(transcript)} entries for interview {interview_id}: {len(user_entries)} user, {len(ai_entries)} AI")
                
                # Log first few entries for debugging
                for i, entry in enumerate(transcript[:3]):
                    speaker = entry.get("speaker", "unknown")
                    text_preview = entry.get("text", "")[:50] + ("..." if len(entry.get("text", "")) > 50 else "")
                    logger.info(f"  [{i+1}] {speaker}: '{text_preview}'")
                
                await save_transcript(interview_id, transcript)
            else:
                logger.warning(f"❌ No transcript to save for interview {interview_id}")

            if audio_buffer:
                await save_mixed_audio(session_id, interview_id, audio_buffer)
        else:
            logger.warning(f"NOT saving data - can_persist={can_persist}, interview_id={interview_id}")

        logger.info(f"Session closed: {session_id}")


async def save_transcript(interview_id: str, transcript: list[dict]):
    """
    Save the interview transcript to the database.
    """
    try:
        from datetime import datetime, timezone
        
        # Add timestamps to entries that don't have them and sort by timestamp
        current_time = datetime.now(timezone.utc)
        for i, entry in enumerate(transcript):
            if "timestamp" not in entry or not entry["timestamp"]:
                # Add incremental timestamps (1 second apart)
                entry["timestamp"] = (current_time.timestamp() + i)
        
        # Sort transcript by timestamp to ensure proper ordering
        sorted_transcript = sorted(transcript, key=lambda x: x.get("timestamp", 0))
        
        interviews_collection = get_interviews_collection()
        await interviews_collection.update_one(
            {"id": interview_id},
            {"$set": {
                "transcript": sorted_transcript,
                "status": "completed",
                "completed_at": current_time
            }}
        )
        logger.info(f"Transcript saved for interview {interview_id} with {len(sorted_transcript)} entries in chronological order")
    except Exception as e:
        logger.error(f"Error saving transcript for interview {interview_id}: {e}")


async def save_mixed_audio(session_id: str, interview_id: str, audio_buffer: AudioBuffer):
    """
    Mix and save the audio streams for this interview.
    """
    try:
        # Get buffer stats before flushing
        stats = await audio_buffer.get_stats()
        logger.info(f"Audio buffer stats for interview {interview_id}: {stats}")
        
        # Flush audio buffer to get all chunks
        mic_chunks, ai_chunks = await audio_buffer.flush()

        if not mic_chunks and not ai_chunks:
            logger.warning(f"No audio data to save for interview {interview_id}")
            return

        # Create audio directory
        audio_dir = Path("uploads/audio")
        audio_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize mixer and paths dictionary
        mixer = AudioMixer(sample_rate=24000, channels=1)
        paths = {}

        # Save microphone audio stream separately
        if mic_chunks:
            mic_path = audio_dir / f"interview_{interview_id}_mic.wav"
            paths["mic"] = str(mic_path)
            try:
                mic_clip = mixer._chunks_to_audioclip(mic_chunks, 1.0)
                mic_clip.write_audiofile(str(mic_path), fps=mixer.sample_rate, nbytes=2, codec='pcm_s16le', logger=None)
                mic_clip.close()
                logger.info(f"Microphone audio saved to {mic_path}")
            except Exception as e:
                logger.error(f"Failed to save microphone audio for interview {interview_id}: {e}", exc_info=True)

        # Save AI audio stream separately
        if ai_chunks:
            ai_path = audio_dir / f"interview_{interview_id}_ai.wav"
            paths["ai"] = str(ai_path)
            try:
                ai_clip = mixer._chunks_to_audioclip(ai_chunks, 1.0)
                ai_clip.write_audiofile(str(ai_path), fps=mixer.sample_rate, nbytes=2, codec='pcm_s16le', logger=None)
                ai_clip.close()
                logger.info(f"AI audio saved to {ai_path}")
            except Exception as e:
                logger.error(f"Failed to save AI audio for interview {interview_id}: {e}", exc_info=True)

        # Mix the two streams
        mixed_path = audio_dir / f"interview_{interview_id}_mixed.wav"
        paths["mixed"] = str(mixed_path)
        try:
            success = await mixer.mix_streams(
                mic_chunks=mic_chunks,
                ai_chunks=ai_chunks,
                output_path=mixed_path,
                mic_volume=1.0,
                ai_volume=1.0
            )
            if success:
                logger.info(f"Mixed audio saved successfully to {mixed_path}")
            else:
                logger.error(f"Audio mixing failed for interview {interview_id}, but individual streams were saved.")
        except Exception as e:
            logger.error(f"An exception occurred during audio mixing for interview {interview_id}: {e}", exc_info=True)
        
        # Update database with all audio paths
        interviews_collection = get_interviews_collection()
        await interviews_collection.update_one(
            {"id": interview_id},
            {"$set": {
                "audio_paths": paths,
                "audio_path": paths.get("mixed", paths.get("mic")) # For legacy support
            }}
        )

    except Exception as e:
        logger.error(f"Error saving mixed audio for interview {interview_id}: {e}", exc_info=True)


async def get_interview_instructions(interview_id: Optional[str]) -> str:
    """
    Get interview-specific instructions based on interview type and configuration.
    Falls back to default if not found.
    """
    if not interview_id:
        logger.info("No interview ID provided, using default instructions.")
        return get_interviewer_system_prompt()

    try:
        interviews_collection = get_interviews_collection()
        interview_doc = await interviews_collection.find_one({"id": interview_id})

        if not interview_doc:
            logger.warning(f"Interview {interview_id} not found, using default instructions")
            return get_interviewer_system_prompt()

        # Always use type-specific configuration to include custom questions, skills, etc.
        from services.interview_service import InterviewService
        from models import Interview
        from utils import parse_from_mongo

        interview = Interview(**parse_from_mongo(interview_doc))
        instructions = InterviewService.get_interview_instructions(interview)

        interview_type = interview_doc.get("interview_type", "standard")
        custom_questions_count = len(interview_doc.get("custom_questions") or [])
        skills_count = len(interview_doc.get("skills") or [])
        logger.info(f"Using {interview_type} interview instructions for interview {interview_id} (custom_questions: {custom_questions_count}, skills: {skills_count})")
        logger.debug(f"Instructions preview: {instructions[:200]}...")

        return instructions

    except Exception as e:
        logger.error(f"Error fetching interview instructions: {e}", exc_info=True)
        return get_interviewer_system_prompt()


async def forward_client_to_openai(websocket: WebSocket, realtime: RealtimeService, audio_buffer: AudioBuffer):
    """Forward messages from client to OpenAI and buffer audio with noise gating."""
    speech_monitor = SpeechActivityMonitor(
        chunk_ms=settings.AUDIO_CHUNK_MS,
        speech_threshold=settings.AUDIO_SPEECH_RMS_THRESHOLD,
        min_speech_ms=settings.AUDIO_MIN_SPEECH_MS,
        min_silence_ms=settings.AUDIO_MIN_SILENCE_MS,
        release_guard_ms=settings.AUDIO_CHUNK_MS * 2,
    )
    zero_chunk_cache: dict[int, str] = {}
    
    # Track recent speech activity to prevent mid-speech interruptions
    recent_speech_chunks = []  # Track last 20 chunks (2 seconds at 100ms chunks)
    max_recent_chunks = 20

    try:
        while True:
            message = await websocket.receive_text()
            data = json.loads(message)

            event_type = data.get("event")

            # Map client events to OpenAI events
            if event_type == "mic_chunk":
                audio_b64 = data.get("audio_b64")
                if not isinstance(audio_b64, str):
                    logger.debug("Ignoring mic_chunk without audio payload")
                    continue

                seq = data.get("seq", 0)
                timestamp_raw = data.get("timestamp")
                timestamp: Optional[float]
                if isinstance(timestamp_raw, (int, float)):
                    timestamp = float(timestamp_raw)
                else:
                    timestamp = None

                try:
                    audio_bytes = base64.b64decode(audio_b64)
                except Exception as exc:
                    logger.warning(f"Failed to decode mic chunk seq={seq}: {exc}")
                    continue

                rms, is_speech = speech_monitor.register_chunk(audio_bytes)

                # Track recent speech activity for intelligent VAD adjustment
                recent_speech_chunks.append(is_speech)
                if len(recent_speech_chunks) > max_recent_chunks:
                    recent_speech_chunks.pop(0)
                
                # Calculate speech density in recent chunks
                recent_speech_count = sum(recent_speech_chunks)
                speech_density = recent_speech_count / len(recent_speech_chunks) if recent_speech_chunks else 0
                
                # Dynamically adjust silence window based on speech activity
                if speech_density > 0.7:  # Very high speech activity (70%+ of recent chunks)
                    # User is actively speaking - extend silence window to prevent interruption
                    target_silence = min(3500, settings.OPENAI_REALTIME_SILENCE_DURATION_MAX_MS)
                    try:
                        await realtime.update_turn_detection(target_silence)
                        if logger.isEnabledFor(logging.DEBUG):
                            logger.debug(f"🗣️  Very high speech activity ({speech_density:.1%}) - extended silence window to {target_silence}ms")
                    except Exception as e:
                        logger.debug(f"Failed to extend silence window during active speech: {e}")
                elif speech_density > 0.4:  # Moderate speech activity
                    # Some speech but not continuous - use default window
                    target_silence = settings.OPENAI_REALTIME_SILENCE_DURATION_MS
                    try:
                        await realtime.update_turn_detection(target_silence)
                        if logger.isEnabledFor(logging.DEBUG):
                            logger.debug(f"🎯 Moderate speech activity ({speech_density:.1%}) - using default silence window {target_silence}ms")
                    except Exception as e:
                        logger.debug(f"Failed to set default silence window: {e}")
                elif speech_density < 0.15:  # Very low speech activity
                    # Mostly silence - use shorter window for responsiveness
                    target_silence = max(2200, settings.OPENAI_REALTIME_SILENCE_DURATION_MS - 800)
                    try:
                        await realtime.update_turn_detection(target_silence)
                        if logger.isEnabledFor(logging.DEBUG):
                            logger.debug(f"🤫 Low speech activity ({speech_density:.1%}) - reduced silence window to {target_silence}ms")
                    except Exception as e:
                        logger.debug(f"Failed to reduce silence window during low activity: {e}")

                # Buffer microphone audio for server-side mixing (keep original bytes)
                await audio_buffer.add_mic_chunk(
                    audio_b64,
                    seq,
                    timestamp,
                    audio_bytes=audio_bytes,
                    rms=rms,
                    is_speech=is_speech,
                )

                if is_speech or len(audio_bytes) == 0:
                    forward_audio_b64 = audio_b64
                else:
                    zero_len = len(audio_bytes)
                    forward_audio_b64 = zero_chunk_cache.get(zero_len)
                    if forward_audio_b64 is None:
                        forward_audio_b64 = base64.b64encode(b"\x00" * zero_len).decode("ascii")
                        zero_chunk_cache[zero_len] = forward_audio_b64

                if logger.isEnabledFor(logging.DEBUG):
                    logger.debug(
                        "Mic chunk processed: seq=%s rms=%.4f speech=%s",
                        seq,
                        rms,
                        is_speech,
                    )

                # Send sanitized chunk to OpenAI for VAD and transcription
                try:
                    await realtime.send_event({
                        "type": "input_audio_buffer.append",
                        "audio": forward_audio_b64
                    })
                    if logger.isEnabledFor(logging.DEBUG) and is_speech:
                        logger.debug(f"🎤 Sent speech audio to OpenAI: seq={seq}, rms={rms:.4f}")
                except RuntimeError as e:
                    logger.warning(f"Failed to send audio chunk: {e}")
                    break  # WebSocket closed, stop processing

            elif event_type == "user_turn_end":
                # More conservative approach: require meaningful speech AND sufficient silence
                speech_duration = speech_monitor.speech_ms
                silence_ms = speech_monitor.current_silence_ms()
                has_meaningful_speech = speech_duration >= settings.AUDIO_MIN_SPEECH_MS
                
                # Check recent speech activity to prevent mid-speech interruptions
                recent_speech_count = sum(recent_speech_chunks[-10:]) if len(recent_speech_chunks) >= 10 else sum(recent_speech_chunks)
                recent_chunks_count = min(len(recent_speech_chunks), 10)
                recent_speech_density = recent_speech_count / recent_chunks_count if recent_chunks_count > 0 else 0
                
                # Dynamic silence requirement based on speech pattern
                base_silence_requirement = settings.AUDIO_MIN_SILENCE_MS
                if recent_speech_density > 0.6:
                    # High activity - require more silence to be sure they're done
                    required_silence = base_silence_requirement * 1.2
                elif recent_speech_density < 0.2:
                    # Low activity - can be more responsive
                    required_silence = base_silence_requirement * 0.7
                else:
                    required_silence = base_silence_requirement
                
                has_sufficient_silence = silence_ms >= required_silence
                
                # Look at speech pattern to detect natural end vs mid-speech pause
                if len(recent_speech_chunks) >= 15:
                    # Compare recent activity (last 1 sec) vs slightly older activity (1-2 sec ago)
                    very_recent = sum(recent_speech_chunks[-10:]) / 10  # Last 1 second
                    slightly_older = sum(recent_speech_chunks[-20:-10]) / 10 if len(recent_speech_chunks) >= 20 else very_recent
                    
                    # If speech activity is declining, user is likely finishing
                    speech_declining = very_recent < slightly_older * 0.6
                    
                    # If user was recently speaking actively but activity is declining, allow commit
                    is_likely_mid_speech = recent_speech_density > 0.5 and not speech_declining
                else:
                    # Not enough history, use simple threshold
                    is_likely_mid_speech = recent_speech_density > 0.3
                
                if (speech_monitor.can_commit() and has_meaningful_speech and has_sufficient_silence and not is_likely_mid_speech):
                    # Explicit end of user's turn -> commit audio buffer to trigger OpenAI transcription
                    try:
                        logger.info(
                            "🎤 User turn ended: speech=%.0fms, silence=%.0fms/%.0fms - committing to OpenAI",
                            speech_duration,
                            silence_ms,
                            required_silence,
                        )
                        
                        # Commit to OpenAI - this will trigger automatic transcription via input_audio_transcription
                        await realtime.send_event({
                            "type": "input_audio_buffer.commit"
                        })
                        speech_monitor.mark_commit_success()
                        # Reset recent speech tracking after successful commit
                        recent_speech_chunks.clear()
                        logger.info("✅ Audio committed to OpenAI - waiting for transcription event")
                        
                    except RuntimeError as e:
                        logger.warning(f"Failed to commit audio buffer: {e}")
                        break
                else:
                    false_turns = speech_monitor.register_false_turn()
                    rejection_reason = []
                    if not speech_monitor.can_commit():
                        rejection_reason.append("cannot_commit")
                    if not has_meaningful_speech:
                        rejection_reason.append("insufficient_speech")
                    if not has_sufficient_silence:
                        rejection_reason.append("insufficient_silence")
                    if is_likely_mid_speech:
                        rejection_reason.append("likely_mid_speech")
                    
                    logger.info(
                        "⏸️  Skipped user_turn_end commit - %s (speech_ms=%s/%s, silence_ms=%s/%.0f, recent_density=%.1%%, false_turns=%s)",
                        "+".join(rejection_reason),
                        speech_duration,
                        settings.AUDIO_MIN_SPEECH_MS,
                        silence_ms,
                        required_silence,
                        recent_speech_density * 100,
                        false_turns,
                    )
                    # Be more aggressive about extending silence window for false turns
                    if false_turns >= 1:  # Changed from 2 to 1 for faster adaptation
                        try:
                            extended = await realtime.extend_silence_window()
                            if extended is not None:
                                logger.info(
                                    "🔧 Extended server VAD silence window to %sms after %s false turn(s)",
                                    extended,
                                    false_turns,
                                )
                                speech_monitor.reset_false_turns()
                        except Exception as exc:
                            logger.debug(f"Failed to extend silence window: {exc}")

            elif event_type == "clear_buffer":
                # Clear any partial audio buffered on the server
                speech_monitor.reset_turn()
                try:
                    await realtime.send_event({
                        "type": "input_audio_buffer.clear"
                    })
                except RuntimeError as e:
                    logger.warning(f"Failed to clear audio buffer: {e}")
                    break

            elif event_type == "barge_in":
                # Interrupt current model response
                try:
                    await realtime.send_event({
                        "type": "response.cancel"
                    })
                except RuntimeError as e:
                    logger.warning(f"Failed to cancel response: {e}")
                    break

            elif event_type == "ai_chunk_played":
                if audio_buffer is not None:
                    seq = data.get("seq")
                    ts = data.get("timestamp")
                    if isinstance(seq, int) and isinstance(ts, (int, float)):
                        await audio_buffer.update_ai_timestamp(seq, float(ts))

            elif event_type == "end":
                # Client wants to end session
                logger.info("Client requested session end")
                
                # Check if there's any user speech that hasn't been committed yet
                if speech_monitor.has_speech():
                    logger.info(f"🎤 User has spoken ({speech_monitor.speech_ms}ms) but not committed - forcing commit before session end")
                    try:
                        await realtime.send_event({"type": "input_audio_buffer.commit"})
                        # Give OpenAI a moment to process the transcription
                        await asyncio.sleep(0.5)
                        logger.info("✅ Forced commit completed - waiting for transcription events")
                    except Exception as exc:
                        logger.warning(f"Failed to commit audio buffer on end: {exc}")
                else:
                    # Ensure any buffered audio is finalized without depending on local heuristics
                    try:
                        await realtime.send_event({"type": "input_audio_buffer.commit"})
                    except Exception as exc:
                        logger.debug(f"Failed to commit audio buffer on end: {exc}")
                break

            # Ignore other client events - OpenAI handles turn detection

    except WebSocketDisconnect:
        try:
            await realtime.close()
        except Exception:
            pass
    except Exception as e:
        logger.error(f"Error forwarding to OpenAI: {e}")
        raise


async def forward_openai_to_client(
    realtime: RealtimeService, websocket: WebSocket, transcript: list[dict], audio_buffer: AudioBuffer
):
    """Forward events from OpenAI to client and buffer AI audio."""
    ai_seq = 0
    client_closed = False
    audio_delta_types = {"response.output_audio.delta", "response.audio.delta"}
    audio_done_types = {"response.output_audio.done", "response.audio.done"}
    assistant_delta_types = {
        "response.output_text.delta",
        "response.output_audio_transcript.delta",
        "response.audio_transcript.delta",
        "response.content_part.delta",
    }
    assistant_done_types = {
        "response.output_text.done",
        "response.output_audio_transcript.done",
        "response.audio_transcript.done",
        "response.content_part.done",
    }

    def extract_audio_b64(event: dict) -> str:
        delta = event.get("delta")
        if isinstance(delta, str):
            return delta
        if isinstance(delta, dict):
            for key in ("audio", "audio_b64", "data", "chunk", "value"):
                val = delta.get(key)
                if isinstance(val, str):
                    return val
        for key in ("audio", "audio_b64", "data", "chunk"):
            val = event.get(key)
            if isinstance(val, str):
                return val
            if isinstance(val, dict):
                for inner_key in ("data", "chunk", "b64", "base64", "value"):
                    inner_val = val.get(inner_key)
                    if isinstance(inner_val, str):
                        return inner_val
        return ""

    def extract_text(event: dict) -> str:
        for key in ("transcript", "text"):
            val = event.get(key)
            if isinstance(val, str):
                return val
        delta = event.get("delta")
        if isinstance(delta, str):
            return delta
        if isinstance(delta, dict):
            for key in ("text", "transcript", "value"):
                val = delta.get(key)
                if isinstance(val, str):
                    return val
            content = delta.get("content")
            if isinstance(content, dict):
                for key in ("text", "transcript", "value"):
                    val = content.get(key)
                    if isinstance(val, str):
                        return val
        content = event.get("content")
        if isinstance(content, dict):
            for key in ("text", "transcript", "value"):
                val = content.get(key)
                if isinstance(val, str):
                    return val
        item = event.get("item")
        if isinstance(item, dict):
            contents = item.get("content") or []
            if isinstance(contents, list):
                for entry in contents:
                    if isinstance(entry, dict):
                        for key in ("transcript", "text", "value"):
                            val = entry.get(key)
                            if isinstance(val, str) and val:
                                return val
        return ""

    async def emit_assistant_text(text: str, *, final: bool) -> bool:
        if not text:
            return True
        if final and transcript and transcript[-1]["speaker"] == "assistant" and transcript[-1]["text"] == text:
            logger.debug("Skipping duplicate final assistant transcript event")
            return True
        if not _merge_transcript_chunk(
            transcript,
            "assistant",
            text,
            final=final,
            replace_on_final=True,
        ):
            return True
        snippet = text[:50] + ("..." if len(text) > 50 else "")
        logger.info(
            f"ASSISTANT transcript {'final' if final else 'delta'}: '{snippet}' (entries: {len(transcript)})"
        )
        return await safe_send({
            "event": "transcript",
            "speaker": "assistant",
            "text": text,
            "final": final
        })

    async def safe_send(payload: dict) -> bool:
        nonlocal client_closed
        if client_closed:
            return False
        try:
            await websocket.send_json(payload)
            return True
        except (WebSocketDisconnect, ConnectionClosed, ConnectionClosedError, ConnectionClosedOK) as exc:
            if not client_closed:
                logger.info(f"Client WebSocket closed while sending event; stopping forwarder: {exc}")
            client_closed = True
            try:
                await realtime.close()
            except Exception:
                pass
            return False
        except RuntimeError as exc:
            if "WebSocket is not connected" in str(exc):
                if not client_closed:
                    logger.info("Client WebSocket no longer connected (runtime error); stopping forwarder.")
                client_closed = True
                try:
                    await realtime.close()
                except Exception:
                    pass
                return False
            raise

    try:
        async for event in realtime.iter_events():
            event_type = event.get("type", "")

            # LOG ALL EVENT TYPES to debug transcription issue
            logger.info(f"🔍 OpenAI Event Type: {event_type}")

            # Log full event for transcription/audio/item related events
            if "transcription" in event_type or "transcript" in event_type or "audio" in event_type or "item" in event_type or "conversation" in event_type:
                if event_type in audio_delta_types:
                    # Avoid logging large base64 audio chunks
                    log_event = event.copy()
                    audio_preview = extract_audio_b64(event)
                    log_event["delta"] = f"<audio chunk len={len(audio_preview) if isinstance(audio_preview, str) else 0}>"
                    if "audio" in log_event:
                        log_event["audio"] = "<omitted audio>"
                    logger.info(f"   Full event data: {log_event}")
                else:
                    logger.info(f"   Full event data: {event}")
            
            # Special logging for any event that might contain user transcription
            if "input" in event_type or "user" in event_type.lower():
                logger.info(f"🎤 POTENTIAL USER EVENT: {event_type} - {event}")
            
            # Log session configuration events
            if event_type in ("session.created", "session.updated"):
                session = event.get("session", {})
                transcription_config = session.get("input_audio_transcription")
                logger.info(f"📋 SESSION EVENT: {event_type}")
                logger.info(f"   Transcription config: {transcription_config}")
                logger.info(f"   Full session: {session}")
            
            # Log buffer commit events
            if event_type == "input_audio_buffer.committed":
                logger.info(f"✅ AUDIO BUFFER COMMITTED - transcription should follow!")
                logger.info(f"   Event data: {event}")

            # Map OpenAI events to client events
            if event_type == "conversation.item.done":
                item = event.get("item", {})
                item_type = item.get("type")
                item_role = item.get("role")
                logger.info(f"conversation.item.done - type: {item_type}, role: {item_role}")

                # Log user messages but don't process them here - handled by dedicated transcription events
                if item_type == "message" and item_role == "user":
                    logger.debug(f"Skipping conversation.item.done for user message - transcription handled by dedicated events")

            elif event_type == "conversation.item.input_audio_transcription.completed":
                # User audio transcription completed event
                item_id = event.get("item_id")
                content_index = event.get("content_index", 0)
                transcript_text = event.get("transcript", "")
                logger.info(f"conversation.item.input_audio_transcription.completed - item_id: {item_id}, transcript: '{transcript_text[:100] if transcript_text else 'EMPTY'}'")

                if _merge_transcript_chunk(
                    transcript,
                    "user",
                    transcript_text,
                    final=True,
                    replace_on_final=False,
                ):
                    logger.info(f"USER transcript added (from .completed event): '{transcript_text[:50]}...' (total entries: {len(transcript)})")

                    if not await safe_send({
                        "event": "transcript",
                        "speaker": "user",
                        "text": transcript_text,
                        "final": True
                    }):
                        return

            elif event_type == "conversation.item.input_audio_transcription.failed":
                # User audio transcription failed
                item_id = event.get("item_id")
                error = event.get("error", {})
                logger.error(f"conversation.item.input_audio_transcription.failed - item_id: {item_id}, error: {error}")

            elif event_type in assistant_delta_types:
                text = extract_text(event)
                if text:
                    if not await emit_assistant_text(text, final=False):
                        return

            elif event_type in assistant_done_types:
                text = extract_text(event)
                if text:
                    if not await emit_assistant_text(text, final=True):
                        return
                if event_type == "response.output_text.done":
                    if not await safe_send({
                        "event": "answer_end"
                    }):
                        return

            elif event_type in audio_delta_types:
                # AI audio chunk
                audio_b64 = extract_audio_b64(event)
                chunk_seq: Optional[int] = None

                # Buffer AI audio for server-side mixing
                if audio_b64:
                    chunk_seq = ai_seq
                    await audio_buffer.add_ai_chunk(audio_b64, chunk_seq)
                    ai_seq += 1

                # Still send to client for playback (lip sync)
                if not await safe_send({
                    "event": "tts_chunk",
                    "audio_b64": audio_b64,
                    "is_final": False,
                    "seq": chunk_seq
                }):
                    return

            elif event_type in audio_done_types:
                # AI finished speaking
                if not await safe_send({
                    "event": "tts_chunk",
                    "audio_b64": "",
                    "is_final": True
                }):
                    return
                if not await safe_send({
                    "event": "answer_end"
                }):
                    return

            elif event_type in {"response.completed", "response.done"}:
                # Model signaled response is fully completed (catch-all)
                if not await safe_send({
                    "event": "answer_end"
                }):
                    return

            elif event_type == "response.function_call.arguments.delta":
                # Accumulate function call args if needed (not used here)
                pass

            elif event_type == "response.function_call":
                # Tool call dispatch
                tool_name = event.get("name") or event.get("function", {}).get("name")
                if tool_name == "end_conversation":
                    reason = event.get("arguments", {}).get("reason", "")
                    # Tell client conversation ended
                    if not await safe_send({
                        "event": "conversation_ended",
                        "reason": reason,
                    }):
                        return
                    # Gracefully stop: cancel model responses and break loops
                    await realtime.send_event({"type": "response.cancel"})
                    break

            elif event_type == "error":
                # OpenAI error
                error = event.get("error", {})
                if not await safe_send({
                    "event": "error",
                    "code": "OPENAI_ERROR",
                    "message": error.get("message", "Unknown error")
                }):
                    return

            # Pass through other events for debugging
            else:
                logger.debug(f"OpenAI event: {event_type}")

    except WebSocketDisconnect:
        try:
            await realtime.close()
        except Exception:
            pass
    except Exception as e:
        logger.error(f"Error forwarding to client: {e}")
        raise


@router.get("/sessions/active")
async def get_active_sessions():
    """Get count of active sessions (for monitoring)."""
    # Simplified - no session tracking needed
    return {"active_sessions": 0}
