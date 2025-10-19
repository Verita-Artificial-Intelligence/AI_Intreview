"""
WebSocket router for realtime interview sessions.

Handles:
- WebSocket connection lifecycle
- Message routing between client and session broker
- Session state management
"""

import asyncio
import json
import logging
from typing import Dict, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from pydantic import ValidationError

from config import settings
from services.session_broker import SessionBroker, SessionConfig
from models.websocket import (
    StartSessionMessage,
    MicChunkMessage,
    UserTurnEndMessage,
    BargeInMessage,
    EndSessionMessage,
    SessionReadyMessage,
    ErrorMessage,
    NoticeMessage,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Active sessions: session_id -> SessionBroker
active_sessions: Dict[str, SessionBroker] = {}


async def get_session_config() -> SessionConfig:
    """Get session configuration from settings."""
    return SessionConfig(
        openai_api_key=settings.OPENAI_API_KEY,
        openai_model=settings.OPENAI_REALTIME_MODEL,
        openai_voice=settings.OPENAI_REALTIME_VOICE,
        openai_instructions=settings.AI_INTERVIEWER_PERSONA,
        elevenlabs_api_key=settings.ELEVENLABS_API_KEY,
        elevenlabs_voice_id=settings.ELEVENLABS_VOICE_ID,
        elevenlabs_model=settings.ELEVENLABS_MODEL,
        enable_latency_logging=settings.ENABLE_LATENCY_LOGGING,
    )


@router.websocket("/ws/session")
async def websocket_endpoint(
    websocket: WebSocket,
    config: SessionConfig = Depends(get_session_config),
):
    """
    WebSocket endpoint for realtime interview sessions.

    Protocol:
    - Client sends: start, mic_chunk, user_turn_end, barge_in, end
    - Server sends: session_ready, transcript, tts_chunk, answer_end, notice, error, metrics
    """
    await websocket.accept()
    logger.info("WebSocket connection established")

    session_broker: Optional[SessionBroker] = None
    session_id: Optional[str] = None

    async def send_to_client(message: dict) -> None:
        """Send message to client via WebSocket."""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending to client: {e}")

    try:
        while True:
            # Receive message from client
            message = await websocket.receive_text()

            try:
                data = json.loads(message)
                event = data.get("event")

                if event == "start":
                    # Initialize session
                    msg = StartSessionMessage(**data)
                    session_id = msg.session_id

                    logger.info(f"Starting session: {session_id}")

                    # Create session broker
                    session_broker = SessionBroker(
                        session_id=session_id,
                        config=config,
                        send_to_client=send_to_client,
                    )

                    # Start session
                    await session_broker.start()

                    # Store in active sessions
                    active_sessions[session_id] = session_broker

                    # Send ready message
                    await send_to_client(
                        SessionReadyMessage(
                            event="session_ready",
                            session_id=session_id,
                            avatar_url=settings.AVATAR_GLB_URL,
                        ).model_dump()
                    )

                    logger.info(f"Session ready: {session_id}")

                elif event == "mic_chunk":
                    # Audio chunk from client
                    msg = MicChunkMessage(**data)

                    if session_broker:
                        await session_broker.handle_mic_chunk(msg.audio_b64)

                elif event == "user_turn_end":
                    # User stopped speaking
                    msg = UserTurnEndMessage(**data)

                    if session_broker:
                        await session_broker.handle_user_turn_end()

                elif event == "barge_in":
                    # User interrupts AI
                    msg = BargeInMessage(**data)

                    if session_broker:
                        await session_broker.handle_barge_in()

                elif event == "end":
                    # End session
                    msg = EndSessionMessage(**data)

                    logger.info(f"Ending session: {session_id}")

                    if session_broker:
                        await session_broker.stop()

                    if session_id and session_id in active_sessions:
                        del active_sessions[session_id]

                    break

                else:
                    logger.warning(f"Unknown event type: {event}")
                    await send_to_client(
                        NoticeMessage(
                            event="notice",
                            msg=f"Unknown event type: {event}",
                            level="warning",
                        ).model_dump()
                    )

            except ValidationError as e:
                logger.error(f"Message validation error: {e}")
                await send_to_client(
                    ErrorMessage(
                        event="error",
                        code="INVALID_MESSAGE",
                        message=str(e),
                    ).model_dump()
                )

            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error: {e}")
                await send_to_client(
                    ErrorMessage(
                        event="error",
                        code="INVALID_JSON",
                        message=str(e),
                    ).model_dump()
                )

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {session_id}")

    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        try:
            await send_to_client(
                ErrorMessage(
                    event="error",
                    code="INTERNAL_ERROR",
                    message=str(e),
                ).model_dump()
            )
        except:
            pass

    finally:
        # Cleanup
        if session_broker:
            await session_broker.stop()

        if session_id and session_id in active_sessions:
            del active_sessions[session_id]

        logger.info(f"WebSocket connection closed: {session_id}")


@router.get("/ws/sessions/active")
async def get_active_sessions():
    """Get count of active sessions (for monitoring)."""
    return {
        "active_sessions": len(active_sessions),
        "session_ids": list(active_sessions.keys()),
    }
