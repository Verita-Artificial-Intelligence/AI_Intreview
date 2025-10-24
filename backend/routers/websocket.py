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
        return False

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
                transcript.append({"speaker": speaker, "text": text})
            else:
                # Default: replace as originally intended
                transcript[-1]["text"] = text
        else:
            # Non-final or no replace: append
            transcript[-1]["text"] += text
    else:
        transcript.append({"speaker": speaker, "text": text})

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

        # Save mixed audio and transcript
        logger.info(f"Session ending - can_persist={can_persist}, interview_id={interview_id}, transcript_length={len(transcript) if transcript else 0}")

        if can_persist and interview_id is not None:
            if transcript:
                logger.info(f"Saving transcript with {len(transcript)} entries for interview {interview_id}")
                await save_transcript(interview_id, transcript)
            else:
                logger.warning(f"No transcript to save for interview {interview_id}")

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
        interviews_collection = get_interviews_collection()
        await interviews_collection.update_one(
            {"id": interview_id},
            {"$set": {
                "transcript": transcript,
                "status": "completed",
                "completed_at": datetime.now(timezone.utc)
            }}
        )
        logger.info(f"Transcript saved for interview {interview_id}")
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
                except RuntimeError as e:
                    logger.warning(f"Failed to send audio chunk: {e}")
                    break  # WebSocket closed, stop processing

            elif event_type == "user_turn_end":
                if speech_monitor.can_commit():
                    # Explicit end of user's turn -> commit audio buffer
                    speech_duration = speech_monitor.speech_ms
                    silence_ms = speech_monitor.current_silence_ms()
                    try:
                        await realtime.send_event({
                            "type": "input_audio_buffer.commit"
                        })
                        speech_monitor.mark_commit_success()
                        logger.debug(
                            "Committed audio buffer after %.0fms of detected speech",
                            speech_duration,
                        )
                        logger.debug(
                            "Silence prior to commit: %.0fms",
                            silence_ms,
                        )
                    except RuntimeError as e:
                        logger.warning(f"Failed to commit audio buffer: {e}")
                        break
                else:
                    false_turns = speech_monitor.register_false_turn()
                    logger.info(
                        "Skipped user_turn_end commit - insufficient speech (speech_ms=%s, silence_ms=%s, false_turns=%s)",
                        speech_monitor.speech_ms,
                        speech_monitor.current_silence_ms(),
                        false_turns,
                    )
                    if false_turns >= 2:
                        try:
                            extended = await realtime.extend_silence_window()
                            if extended is not None:
                                logger.info(
                                    "Extended server VAD silence window to %sms after %s false turn(s)",
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
            if "transcription" in event_type or "transcript" in event_type or "audio" in event_type or "item" in event_type:
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

            # Map OpenAI events to client events
            if event_type == "conversation.item.done":
                item = event.get("item", {})
                item_type = item.get("type")
                item_role = item.get("role")
                logger.info(f"conversation.item.done - type: {item_type}, role: {item_role}")

                # Case 1: legacy-style transcription item
                if item_type == "input_audio_transcription":
                    # User transcript
                    text = item.get("transcript", "")
                    logger.info(f"  input_audio_transcription text: '{text[:100] if text else 'EMPTY'}'")
                    if _merge_transcript_chunk(
                        transcript,
                        "user",
                        text,
                        final=True,
                        replace_on_final=True,
                    ):
                        logger.info(f"USER transcript added: '{text[:50]}...' (total entries: {len(transcript)})")
                        if not await safe_send({
                            "event": "transcript",
                            "speaker": "user",
                            "text": text,
                            "final": True
                        }):
                            return
                        # Server VAD will automatically trigger response, no manual response.create needed
                # Case 2: GA message item containing user content entries
                elif item_type == "message" and item_role == "user":
                    content = item.get("content", []) or []
                    logger.info(f"  user message with {len(content)} content entries")
                    extracted_text = None
                    for c in content:
                        ctype = c.get("type")
                        logger.info(f"    content type: {ctype}")
                        if ctype == "input_audio_transcription":
                            extracted_text = c.get("transcript") or c.get("text")
                            logger.info(f"      transcript: '{extracted_text[:100] if extracted_text else 'EMPTY'}'")
                        elif ctype in ("input_text", "text") and not extracted_text:
                            extracted_text = c.get("text")
                            logger.info(f"      text: '{extracted_text[:100] if extracted_text else 'EMPTY'}'")
                    if _merge_transcript_chunk(
                        transcript,
                        "user",
                        extracted_text,
                        final=True,
                        replace_on_final=False,
                    ):
                        logger.info(f"USER transcript added: '{extracted_text[:50]}...' (total entries: {len(transcript)})")
                        if not await safe_send({
                            "event": "transcript",
                            "speaker": "user",
                            "text": extracted_text,
                            "final": True
                        }):
                            return
                        # Server VAD will automatically trigger response, no manual response.create needed
                    else:
                        logger.warning(f"  user message had NO extractable text! content: {content}")

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

            elif event_type == "conversation.item.input_audio_transcription.delta":
                # User audio transcription streaming delta
                item_id = event.get("item_id")
                content_index = event.get("content_index", 0)
                delta = event.get("delta", "")
                logger.info(f"conversation.item.input_audio_transcription.delta - item_id: {item_id}, delta: '{delta[:100] if delta else 'EMPTY'}'")

                if _merge_transcript_chunk(transcript, "user", delta):

                    if not await safe_send({
                        "event": "transcript",
                        "speaker": "user",
                        "text": delta,
                        "final": False
                    }):
                        return

            elif event_type == "response.input_audio_transcription.delta":
                # GA streaming transcription for user speech
                delta = event.get("delta", "")
                logger.info(f"response.input_audio_transcription.delta - delta: '{delta[:100] if delta else 'EMPTY'}'")

                if _merge_transcript_chunk(transcript, "user", delta):
                    logger.info(f"USER transcript delta merged (response.* event). Current length: {len(transcript)}")

                    if not await safe_send({
                        "event": "transcript",
                        "speaker": "user",
                        "text": delta,
                        "final": False
                    }):
                        return

            elif event_type == "response.input_audio_transcription.done":
                # GA final transcription for user speech
                transcript_text = event.get("transcript") or event.get("text") or ""
                logger.info(
                    f"response.input_audio_transcription.done - transcript: '{transcript_text[:100] if transcript_text else 'EMPTY'}'"
                )

                if _merge_transcript_chunk(
                    transcript,
                    "user",
                    transcript_text,
                    final=True,
                    replace_on_final=False,
                ):
                    logger.info(f"USER transcript finalized (response.* event). Current length: {len(transcript)}")

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
