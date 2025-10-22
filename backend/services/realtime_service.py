"""
Thin proxy to OpenAI Realtime API.

Establishes WebSocket connection and forwards events bidirectionally.
"""

import asyncio
import json
import logging
from typing import AsyncIterator, Optional, Dict, Any
import websockets
from websockets.client import WebSocketClientProtocol

logger = logging.getLogger(__name__)


class RealtimeService:
    """Thin proxy to OpenAI Realtime API."""

    def __init__(
        self,
        api_key: str,
        model: str = "gpt-realtime",
        voice: str = "verse",
        instructions: str = "",
    ):
        """
        Initialize Realtime API proxy.

        Args:
            api_key: OpenAI API key
            model: Model name
            voice: Voice for TTS
            instructions: System instructions
        """
        self.api_key = api_key
        self.model = model
        self.voice = voice
        self.instructions = instructions
        self.ws: Optional[WebSocketClientProtocol] = None
        self.connected = False
        self._receive_task: Optional[asyncio.Task] = None
        self._event_queue: asyncio.Queue = asyncio.Queue()

    async def connect(self) -> None:
        """Establish WebSocket connection to OpenAI Realtime API."""
        try:
            url = f"wss://api.openai.com/v1/realtime?model={self.model}"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "OpenAI-Beta": "realtime=v1",
            }

            logger.info(f"Connecting to OpenAI Realtime API: {self.model}")

            self.ws = await websockets.connect(
                url,
                additional_headers=headers,
                subprotocols=["realtime"],
                ping_interval=10,
                ping_timeout=30,
                close_timeout=5,
            )

            self.connected = True
            logger.info("Connected to OpenAI Realtime API")

            # Start receiving messages
            self._receive_task = asyncio.create_task(self._receive_loop())

            # Configure session with minimal settings
            await self._configure_session()

        except Exception as e:
            logger.error(f"Failed to connect to OpenAI: {e}")
            self.connected = False
            raise

    async def _configure_session(self) -> None:
        """Configure session with instructions and voice for OpenAI Realtime."""
        config = {
            "type": "session.update",
            "session": {
                "type": "realtime",
                "model": self.model,
                "instructions": self.instructions,
                "input_audio_transcription": {
                    "model": "whisper-small"
                },
                "audio": {
                    "output": {"voice": self.voice},
                    "input": {
                        "turn_detection": {
                            "type": "server_vad",
                            "silence_duration_ms": 600
                        }
                    }
                },
                "tools": [
                    {
                        "type": "function",
                        "name": "end_conversation",
                        "description": "End the interview when appropriate and wrap up politely.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "reason": {"type": "string", "description": "Why the conversation is ending."}
                            },
                            "required": []
                        }
                    }
                ],
            },
        }
        await self.send_event(config)
        logger.info("Session configured with input_audio_transcription")

    async def _receive_loop(self) -> None:
        """Receive and queue messages from OpenAI."""
        try:
            if not self.ws:
                return

            async for message in self.ws:
                try:
                    event = json.loads(message)
                    await self._event_queue.put(event)

                    # Log important events
                    event_type = event.get("type", "")
                    if "error" in event_type or "session" in event_type:
                        logger.debug(f"OpenAI event: {event_type}")

                except json.JSONDecodeError as e:
                    logger.error(f"Failed to decode message: {e}")

        except websockets.exceptions.ConnectionClosed:
            logger.info("OpenAI connection closed")
            self.connected = False
        except Exception as e:
            logger.error(f"Error in receive loop: {e}")
            self.connected = False

    async def send_event(self, event: Dict[str, Any]) -> None:
        """Send event to OpenAI."""
        if not self.ws or not self.connected:
            raise RuntimeError("WebSocket not connected")

        await self.ws.send(json.dumps(event))

    async def iter_events(self) -> AsyncIterator[Dict[str, Any]]:
        """Iterate over events from OpenAI."""
        while self.connected or not self._event_queue.empty():
            try:
                event = await asyncio.wait_for(self._event_queue.get(), timeout=0.1)
                yield event
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Error iterating events: {e}")
                break

    async def close(self) -> None:
        """Close connection and cleanup."""
        self.connected = False

        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass

        if self.ws:
            await self.ws.close()
            logger.info("Connection closed")
