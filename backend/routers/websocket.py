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
from database import get_interviews_collection
from prompts.chat import get_interviewer_system_prompt

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

        logger.info(f"Starting session: {session_id}")

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

        # Start bidirectional forwarding
        openai_task = asyncio.create_task(
            forward_openai_to_client(realtime, websocket, transcript)
        )
        client_proxy_task = asyncio.create_task(
            forward_client_to_openai(websocket, realtime)
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

        if interview_id is not None and transcript:
            await save_transcript(interview_id, transcript)

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


async def forward_client_to_openai(websocket: WebSocket, realtime: RealtimeService):
    """Forward messages from client to OpenAI."""
    try:
        while True:
            message = await websocket.receive_text()
            data = json.loads(message)

            event_type = data.get("event")

            # Map client events to OpenAI events
            if event_type == "mic_chunk":
                # Audio input from client
                await realtime.send_event({
                    "type": "input_audio_buffer.append",
                    "audio": data.get("audio_b64")
                })

            elif event_type == "user_turn_end":
                # Explicit end of user's turn -> commit audio buffer
                await realtime.send_event({
                    "type": "input_audio_buffer.commit"
                })

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
    realtime: RealtimeService, websocket: WebSocket, transcript: list[dict]
):
    """Forward events from OpenAI to client."""
    try:
        async for event in realtime.iter_events():
            event_type = event.get("type", "")

            # Map OpenAI events to client events
            if event_type == "conversation.item.done":
                item = event.get("item", {})
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
                        # After user's turn completes, ask model to respond
                        await realtime.send_event({"type": "response.create"})

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
                await websocket.send_json({
                    "event": "tts_chunk",
                    "audio_b64": event.get("delta", ""),
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
