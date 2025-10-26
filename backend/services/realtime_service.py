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
        silence_duration_ms: int = 1200,
        max_silence_duration_ms: Optional[int] = None,
        silence_duration_step_ms: int = 200,
    ):
        """
        Initialize Realtime API proxy.

        Args:
            api_key: OpenAI API key
            model: Model name
            voice: Voice for TTS
            instructions: System instructions
            silence_duration_ms: Initial server VAD silence window
            max_silence_duration_ms: Upper bound for adaptive silence window
            silence_duration_step_ms: Increment to use when adapting the window
        """
        self.api_key = api_key
        self.model = model
        self.voice = voice
        self.instructions = instructions
        self.ws: Optional[WebSocketClientProtocol] = None
        self.connected = False
        self._receive_task: Optional[asyncio.Task] = None
        self._event_queue: asyncio.Queue = asyncio.Queue()
        self._initial_silence_duration_ms = max(200, silence_duration_ms)
        self._max_silence_duration_ms = max(
            self._initial_silence_duration_ms,
            (max_silence_duration_ms or self._initial_silence_duration_ms),
        )
        self._silence_duration_step_ms = max(50, silence_duration_step_ms)
        self._current_silence_duration_ms = self._initial_silence_duration_ms
        self._last_vad_update_time = 0  # Throttle VAD updates

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
                ping_interval=None,  # Disable client pings, let OpenAI handle keepalive
                close_timeout=10,
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
                "instructions": self.instructions,
                "voice": self.voice,
                "input_audio_format": "pcm16",
                "output_audio_format": "pcm16",
                "input_audio_transcription": {"model": "whisper-1"},
                "turn_detection": {
                    "type": "server_vad",
                    "silence_duration_ms": self._current_silence_duration_ms,
                },
                "tools": [
                    {
                        "type": "function",
                        "name": "end_conversation",
                        "description": "End the interview when appropriate and wrap up politely.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "reason": {
                                    "type": "string",
                                    "description": "Why the conversation is ending.",
                                }
                            },
                            "required": [],
                        },
                    }
                ],
            },
        }
        await self.send_event(config)
        logger.info("Session configured with input_audio_transcription: whisper-1")

    async def update_turn_detection(self, silence_duration_ms: int) -> None:
        """
        Update the server VAD silence window for the active session.

        Args:
            silence_duration_ms: New silence duration in milliseconds.
        """
        import time

        target = max(200, min(silence_duration_ms, self._max_silence_duration_ms))
        if target == self._current_silence_duration_ms:
            return

        # Throttle VAD updates to avoid overwhelming OpenAI API
        current_time = time.time()
        if current_time - self._last_vad_update_time < 0.5:  # Max 2 updates per second
            return

        self._last_vad_update_time = current_time

        event = {
            "type": "session.update",
            "session": {
                "input_audio_transcription": {"model": "whisper-1"},
                "turn_detection": {
                    "type": "server_vad",
                    "silence_duration_ms": target,
                },
            },
        }
        await self.send_event(event)
        logger.info(
            "Updated server VAD silence window: %sms -> %sms",
            self._current_silence_duration_ms,
            target,
        )
        self._current_silence_duration_ms = target

    async def extend_silence_window(self) -> Optional[int]:
        """
        Increase the silence window in controlled increments.

        Returns:
            Optional[int]: The applied silence duration, or None if no change was made.
        """
        target = min(
            self._current_silence_duration_ms + self._silence_duration_step_ms,
            self._max_silence_duration_ms,
        )
        if target == self._current_silence_duration_ms:
            logger.debug(
                "Silence window already at max: %sms",
                self._current_silence_duration_ms,
            )
            return None

        await self.update_turn_detection(target)
        return self._current_silence_duration_ms

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

        try:
            await self.ws.send(json.dumps(event))
        except websockets.exceptions.ConnectionClosed as e:
            self.connected = False
            logger.warning(f"WebSocket closed while sending event: {e}")
            raise RuntimeError("WebSocket not connected") from e

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
