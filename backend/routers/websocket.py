"""
Simple bidirectional proxy between client and OpenAI Realtime API.

Client ↔ Backend ↔ OpenAI
"""

import asyncio
import json
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from uuid import uuid4

from config import settings
from services.realtime_service import RealtimeService
from services.audio_buffer import AudioBuffer
from services.audio_mixer import AudioMixer
from database import get_interviews_collection
from prompts.chat import get_interviewer_system_prompt
from pathlib import Path

logger = logging.getLogger(__name__)

router = APIRouter()


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
    idle_commit_task: Optional[asyncio.Task] = None
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

        logger.info(f"Starting session: {session_id}")

        # Initialize audio buffer for server-side mixing
        audio_buffer = AudioBuffer(sample_rate=24000, channels=1)

        # Pre-check interview state to guide flow and persistence
        if interview_id:
            try:
                from database import get_jobs_collection
                interviews_collection = get_interviews_collection()
                interview_doc = await interviews_collection.find_one({"id": interview_id})

                if not interview_doc:
                    # Create new interview document
                    from datetime import datetime, timezone
                    interview_doc = {
                        "id": interview_id,
                        "status": "in_progress",
                        "created_at": datetime.now(timezone.utc),
                        "transcript": []
                    }

                    # Add job information if job_id provided
                    if job_id:
                        jobs_collection = get_jobs_collection()
                        job = await jobs_collection.find_one({"id": job_id}, {"_id": 0})
                        if job:
                            interview_doc["job_id"] = job_id
                            interview_doc["job_title"] = job.get("title")
                            interview_doc["position"] = job.get("title")

                    await interviews_collection.insert_one(interview_doc)
                    logger.info(f"Created new interview document: {interview_id}")
                elif interview_doc.get("status") == "completed":
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
        )

        await realtime.connect()

        # Notify client session is ready
        await websocket.send_json({
            "event": "session_ready",
            "session_id": session_id,
        })

        logger.info(f"Session ready: {session_id}")

        # Shared state for audio timing
        audio_timing = {"last_audio_ts": None, "commit_sent": False}

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
            forward_client_to_openai(websocket, realtime, audio_buffer, audio_timing)
        )

        # Idle commit watchdog to avoid VAD stalls
        async def idle_commit_watcher():
            try:
                while True:
                    await asyncio.sleep(0.5)
                    if audio_timing["last_audio_ts"] is None:
                        continue
                    # If no audio for > 2.0s and we haven't committed this window, send commit
                    if (asyncio.get_event_loop().time() - audio_timing["last_audio_ts"]) > 2.0 and not audio_timing["commit_sent"]:
                        try:
                            await realtime.send_event({"type": "input_audio_buffer.commit"})
                            audio_timing["commit_sent"] = True
                        except Exception as _:
                            pass
            except asyncio.CancelledError:
                return

        idle_commit_task = asyncio.create_task(idle_commit_watcher())

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
        if idle_commit_task:
            idle_commit_task.cancel()

        # Await task cancellation to avoid hanging during reload
        tasks = [t for t in (openai_task, client_proxy_task, idle_commit_task) if t]
        if tasks:
            try:
                await asyncio.gather(*tasks, return_exceptions=True)
            except Exception:
                pass

        if realtime:
            await realtime.close()

        # Save mixed audio and transcript
        if can_persist and interview_id is not None:
            if transcript:
                await save_transcript(interview_id, transcript)

            if audio_buffer:
                await save_mixed_audio(session_id, interview_id, audio_buffer)

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
        # Create audio directory
        audio_dir = Path("uploads/audio")
        audio_dir.mkdir(parents=True, exist_ok=True)

        # Output path for mixed audio
        output_path = audio_dir / f"interview_{interview_id}_audio.wav"

        # Flush audio buffer
        mic_chunks, ai_chunks = await audio_buffer.flush()

        stats = await audio_buffer.get_stats()
        logger.info(f"Mixing audio for interview {interview_id}: {stats}")

        if not mic_chunks and not ai_chunks:
            logger.warning(f"No audio data to mix for interview {interview_id}")
            return

        # Mix audio streams
        mixer = AudioMixer(sample_rate=24000, channels=1)
        success = await mixer.mix_streams(
            mic_chunks=mic_chunks,
            ai_chunks=ai_chunks,
            output_path=output_path,
            mic_volume=1.0,
            ai_volume=1.0
        )

        if success:
            logger.info(f"Mixed audio saved: {output_path}")

            # Update database with audio path
            interviews_collection = get_interviews_collection()
            await interviews_collection.update_one(
                {"id": interview_id},
                {"$set": {"audio_path": str(output_path)}}
            )
        else:
            logger.error(f"Failed to mix audio for interview {interview_id}")

    except Exception as e:
        logger.error(f"Error saving mixed audio for interview {interview_id}: {e}", exc_info=True)


async def get_interview_instructions(interview_id: Optional[str]) -> str:
    """
    Get interview-specific instructions from database.
    Falls back to default if not found.
    """
    if not interview_id:
        logger.info("No interview ID provided, using default instructions.")
        return get_interviewer_system_prompt()

    try:
        interviews_collection = get_interviews_collection()
        interview = await interviews_collection.find_one({"id": interview_id})

        if not interview:
            logger.warning(f"Interview {interview_id} not found, using default instructions")
            return get_interviewer_system_prompt()

        # Build custom instructions
        candidate = interview.get("candidate", {})
        role = interview.get("role", {})

        instructions = get_interviewer_system_prompt(
            position=interview.get("position", "Software Engineer"),
            candidate_name=candidate.get("name", "Candidate"),
            candidate_skills=candidate.get("skills", []),
            candidate_experience_years=candidate.get("experience_years", 0),
            candidate_bio=candidate.get("bio", ""),
            role_description=interview.get("role_description") or role.get("description", ""),
            role_requirements=interview.get("role_requirements") or role.get("requirements", []),
        )

        logger.info(f"Using custom instructions for interview {interview_id}")
        return instructions

    except Exception as e:
        logger.error(f"Error fetching interview: {e}")
        return get_interviewer_system_prompt()


async def forward_client_to_openai(websocket: WebSocket, realtime: RealtimeService, audio_buffer: AudioBuffer, audio_timing: dict):
    """Forward messages from client to OpenAI and buffer audio."""
    try:
        while True:
            message = await websocket.receive_text()
            data = json.loads(message)

            event_type = data.get("event")

            # Map client events to OpenAI events
            if event_type == "mic_chunk":
                audio_b64 = data.get("audio_b64")
                seq = data.get("seq", 0)

                # Buffer microphone audio for server-side mixing
                await audio_buffer.add_mic_chunk(audio_b64, seq)

                # Still send to OpenAI for VAD and transcription
                await realtime.send_event({
                    "type": "input_audio_buffer.append",
                    "audio": audio_b64
                })
                # Update last audio time and reset commit window flag
                audio_timing["last_audio_ts"] = asyncio.get_event_loop().time()
                audio_timing["commit_sent"] = False

            elif event_type == "user_turn_end":
                # Explicit end of user's turn -> commit audio buffer
                await realtime.send_event({
                    "type": "input_audio_buffer.commit"
                })
                # Mark commit sent for this window
                audio_timing["commit_sent"] = True

            elif event_type == "clear_buffer":
                # Clear any partial audio buffered on the server
                await realtime.send_event({
                    "type": "input_audio_buffer.clear"
                })

            elif event_type == "barge_in":
                # Interrupt current model response
                await realtime.send_event({
                    "type": "response.cancel"
                })

            elif event_type == "end":
                # Client wants to end session
                logger.info("Client requested session end")
                break

            # Ignore other client events - OpenAI handles turn detection

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"Error forwarding to OpenAI: {e}")
        raise


async def forward_openai_to_client(
    realtime: RealtimeService, websocket: WebSocket, transcript: list[dict], audio_buffer: AudioBuffer
):
    """Forward events from OpenAI to client and buffer AI audio."""
    ai_seq = 0

    try:
        async for event in realtime.iter_events():
            event_type = event.get("type", "")

            # Map OpenAI events to client events
            if event_type == "conversation.item.done":
                item = event.get("item", {})
                # Case 1: legacy-style transcription item
                if item.get("type") == "input_audio_transcription":
                    # User transcript
                    text = item.get("transcript", "")
                    if text:
                        transcript.append({"speaker": "user", "text": text})
                        await websocket.send_json({
                            "event": "transcript",
                            "speaker": "user",
                            "text": text,
                            "final": True
                        })
                        # Server VAD will automatically trigger response, no manual response.create needed
                # Case 2: GA message item containing user content entries
                elif item.get("type") == "message" and item.get("role") == "user":
                    content = item.get("content", []) or []
                    extracted_text = None
                    for c in content:
                        ctype = c.get("type")
                        if ctype == "input_audio_transcription":
                            extracted_text = c.get("transcript") or c.get("text")
                        elif ctype == "input_text" and not extracted_text:
                            extracted_text = c.get("text")
                    if extracted_text:
                        transcript.append({"speaker": "user", "text": extracted_text})
                        await websocket.send_json({
                            "event": "transcript",
                            "speaker": "user",
                            "text": extracted_text,
                            "final": True
                        })
                        # Server VAD will automatically trigger response, no manual response.create needed

            elif event_type == "response.output_audio_transcript.delta":
                # Streaming user transcription (GA)
                text = event.get("delta", "")
                if text:
                    await websocket.send_json({
                        "event": "transcript",
                        "speaker": "user",
                        "text": text,
                        "final": False
                    })

            elif event_type == "response.output_audio_transcript.done":
                # Finalized user transcription (GA) -> advance turn
                text = event.get("transcript", "")
                if text:
                    transcript.append({"speaker": "user", "text": text})
                    await websocket.send_json({
                        "event": "transcript",
                        "speaker": "user",
                        "text": text,
                        "final": True
                    })
                    # Server VAD will automatically trigger response, no manual response.create needed

            elif event_type == "response.output_text.delta":
                # AI transcript
                text = event.get("delta", "")
                if text:
                    # This is a bit tricky as we get deltas. We'll add to the last message if it's from the assistant.
                    if transcript and transcript[-1]["speaker"] == "assistant":
                        transcript[-1]["text"] += text
                    else:
                        transcript.append({"speaker": "assistant", "text": text})

                    await websocket.send_json({
                        "event": "transcript",
                        "speaker": "assistant",
                        "text": text,
                        "final": False
                    })

            elif event_type == "response.output_text.done":
                # Assistant finished text output segment
                await websocket.send_json({
                    "event": "answer_end"
                })

            elif event_type == "response.output_audio.delta":
                # AI audio chunk
                audio_b64 = event.get("delta", "")

                # Buffer AI audio for server-side mixing
                if audio_b64:
                    await audio_buffer.add_ai_chunk(audio_b64, ai_seq)
                    ai_seq += 1

                # Still send to client for playback (lip sync)
                await websocket.send_json({
                    "event": "tts_chunk",
                    "audio_b64": audio_b64,
                    "is_final": False
                })

            elif event_type == "response.output_audio.done":
                # AI finished speaking
                await websocket.send_json({
                    "event": "tts_chunk",
                    "audio_b64": "",
                    "is_final": True
                })
                await websocket.send_json({
                    "event": "answer_end"
                })

            elif event_type == "response.completed":
                # Model signaled response is fully completed (catch-all)
                await websocket.send_json({
                    "event": "answer_end"
                })

            elif event_type == "response.function_call.arguments.delta":
                # Accumulate function call args if needed (not used here)
                pass

            elif event_type == "response.function_call":
                # Tool call dispatch
                tool_name = event.get("name") or event.get("function", {}).get("name")
                if tool_name == "end_conversation":
                    reason = event.get("arguments", {}).get("reason", "")
                    # Tell client conversation ended
                    await websocket.send_json({
                        "event": "conversation_ended",
                        "reason": reason,
                    })
                    # Gracefully stop: cancel model responses and break loops
                    await realtime.send_event({"type": "response.cancel"})
                    break

            elif event_type == "error":
                # OpenAI error
                error = event.get("error", {})
                await websocket.send_json({
                    "event": "error",
                    "code": "OPENAI_ERROR",
                    "message": error.get("message", "Unknown error")
                })

            # Pass through other events for debugging
            else:
                logger.debug(f"OpenAI event: {event_type}")

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"Error forwarding to client: {e}")
        raise


@router.get("/sessions/active")
async def get_active_sessions():
    """Get count of active sessions (for monitoring)."""
    # Simplified - no session tracking needed
    return {"active_sessions": 0}
