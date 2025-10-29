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
from config import settings

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
        self._conversation_history: list[dict] = (
            []
        )  # Track conversation for context restoration
        self._reconnect_attempts = 0
        self._max_reconnect_attempts = (
            settings.WS_RECONNECT_MAX_ATTEMPTS
        )  # Configurable via env
        self._max_backoff_seconds = (
            settings.WS_RECONNECT_MAX_BACKOFF
        )  # Configurable via env
        self._is_reconnecting = False
        self._reconnection_succeeded = False  # Track if last reconnection succeeded

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
                ping_interval=20,  # Keep connection alive with pings
                ping_timeout=10,
                close_timeout=10,
            )

            self.connected = True
            logger.info("Connected to OpenAI Realtime API")

            # Start receiving messages
            self._receive_task = asyncio.create_task(self._receive_loop())

            # Configure session with minimal settings
            await self._configure_session()

            # If we have conversation history (from reconnection), restore it
            if self._conversation_history:
                logger.info(
                    f"Restoring conversation context with {len(self._conversation_history)} messages"
                )
                await self._restore_conversation_context()
                self._reconnect_attempts = 0  # Reset after successful restoration
            else:
                self._reconnect_attempts = 0  # Reset on initial connection

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

    async def _restore_conversation_context(self) -> None:
        """Restore conversation history after reconnection."""
        try:
            for item in self._conversation_history:
                # Create conversation item to restore context
                await self.send_event(
                    {"type": "conversation.item.create", "item": item}
                )
                # Small delay to avoid overwhelming the API
                await asyncio.sleep(0.05)

            logger.info(
                f"Successfully restored {len(self._conversation_history)} conversation items"
            )

            # Check if we should trigger a response
            # If the last message was from the user, the AI should respond
            if self._conversation_history:
                last_message = self._conversation_history[-1]
                last_role = last_message.get("role")

                if last_role == "user":
                    logger.info("Last message was from user - triggering AI response")
                    # Wait a moment for context to settle
                    await asyncio.sleep(0.2)
                    # Trigger response
                    await self.send_event({"type": "response.create"})
                else:
                    logger.info(
                        "Last message was from assistant - waiting for user's next turn"
                    )
                    # Don't trigger response - let user continue naturally

        except Exception as e:
            logger.error(f"Failed to restore conversation context: {e}", exc_info=True)

    def track_conversation_item(self, event: dict) -> None:
        """Track completed conversation items for context restoration."""
        try:
            event_type = event.get("type", "")

            # Track completed conversation items (both user and assistant messages)
            # OpenAI uses different event types for different item completions
            if event_type in [
                "conversation.item.done",
                "response.output_item.done",
                "conversation.item.input_audio_transcription.completed",
            ]:
                item = event.get("item", {})

                # Handle input_audio_transcription.completed differently
                if (
                    event_type
                    == "conversation.item.input_audio_transcription.completed"
                ):
                    transcript_text = event.get("transcript", "")
                    if transcript_text:
                        self._conversation_history.append(
                            {
                                "type": "message",
                                "role": "user",
                                "content": [
                                    {"type": "input_text", "text": transcript_text}
                                ],
                            }
                        )
                        logger.info(
                            f"Tracked USER message in conversation history: '{transcript_text[:50]}...' (total: {len(self._conversation_history)})"
                        )
                    return

                item_type = item.get("type")
                role = item.get("role")
                status = item.get("status")

                # Only track completed message items
                if (
                    item_type == "message"
                    and role in ["user", "assistant"]
                    and status == "completed"
                ):
                    content = item.get("content", [])
                    if content:
                        # Extract text from content for logging
                        text_preview = ""
                        for c in content:
                            if isinstance(c, dict):
                                text_preview = c.get("transcript", c.get("text", ""))[
                                    :50
                                ]
                                if text_preview:
                                    break

                        # Store a simplified version for restoration
                        self._conversation_history.append(
                            {"type": "message", "role": role, "content": content}
                        )
                        logger.info(
                            f"Tracked {role.upper()} message in conversation history: '{text_preview}...' (total: {len(self._conversation_history)})"
                        )

        except Exception as e:
            logger.warning(f"Error tracking conversation item: {e}", exc_info=True)

    async def update_turn_detection(self, silence_duration_ms: int) -> None:
        """
        Update the server VAD silence window for the active session.

        Args:
            silence_duration_ms: New silence duration in milliseconds.
        """
        import time

        target = max(200, min(silence_duration_ms, self._max_silence_duration_ms))

        # Only update if there's a significant change (at least 400ms difference)
        delta = abs(target - self._current_silence_duration_ms)
        if delta < 400:
            return

        # Aggressive throttling to avoid overwhelming OpenAI API
        current_time = time.time()
        if (
            current_time - self._last_vad_update_time < 5.0
        ):  # Max 1 update per 5 seconds
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

                    # Track conversation items for context restoration
                    self.track_conversation_item(event)

                    await self._event_queue.put(event)

                    # Log important events
                    event_type = event.get("type", "")
                    if "error" in event_type or "session" in event_type:
                        logger.debug(f"OpenAI event: {event_type}")

                except json.JSONDecodeError as e:
                    logger.error(f"Failed to decode message: {e}")

        except websockets.exceptions.ConnectionClosed as e:
            logger.error(f"OpenAI connection closed unexpectedly: {e}")
            self.connected = False
            # Attempt reconnection with context restoration
            await self._attempt_reconnect()
        except Exception as e:
            logger.error(f"Error in receive loop: {e}")
            self.connected = False
            # Attempt reconnection
            await self._attempt_reconnect()

    async def _attempt_reconnect(self) -> None:
        """Attempt to reconnect with exponential backoff and restore conversation context."""
        if self._is_reconnecting:
            logger.debug("Reconnection already in progress, skipping duplicate attempt")
            return  # Already reconnecting

        self._is_reconnecting = True
        logger.warning(f"Setting _is_reconnecting=True, starting reconnection process")

        logger.warning(
            f"OpenAI connection lost. Attempting to reconnect and restore conversation context "
            f"({len(self._conversation_history)} messages in history)"
        )

        # Notify client that reconnection is starting
        await self._event_queue.put(
            {
                "type": "connection.reconnecting",
                "message": "Connection lost, attempting to reconnect...",
                "attempt": 0,
                "max_attempts": self._max_reconnect_attempts,
            }
        )

        while self._reconnect_attempts < self._max_reconnect_attempts:
            self._reconnect_attempts += 1
            # Exponential backoff capped at configured max
            backoff_time = min(2**self._reconnect_attempts, self._max_backoff_seconds)

            total_outage_time = sum(
                min(2**i, self._max_backoff_seconds)
                for i in range(1, self._reconnect_attempts + 1)
            )
            logger.warning(
                f"Reconnection attempt {self._reconnect_attempts}/{self._max_reconnect_attempts} "
                f"in {backoff_time}s... (total time since disconnect: ~{total_outage_time}s)"
            )

            # Notify client of retry attempt
            await self._event_queue.put(
                {
                    "type": "connection.reconnecting",
                    "message": f"Reconnecting (attempt {self._reconnect_attempts}/{self._max_reconnect_attempts})...",
                    "attempt": self._reconnect_attempts,
                    "max_attempts": self._max_reconnect_attempts,
                }
            )

            await asyncio.sleep(backoff_time)

            try:
                await self.connect()
                logger.info(
                    f"Successfully reconnected to OpenAI after {self._reconnect_attempts} attempts"
                )
                self._is_reconnecting = False
                self._reconnection_succeeded = True  # Mark successful reconnection

                # Notify client of successful reconnection
                await self._event_queue.put(
                    {
                        "type": "connection.reconnected",
                        "message": "Connection restored successfully",
                        "context_restored": len(self._conversation_history) > 0,
                        "attempts_taken": self._reconnect_attempts,
                    }
                )
                return
            except Exception as e:
                logger.warning(
                    f"Reconnection attempt {self._reconnect_attempts}/{self._max_reconnect_attempts} failed: {e}"
                )

        # If all reconnection attempts failed
        logger.error(
            f"Failed to reconnect after {self._max_reconnect_attempts} attempts"
        )
        self._is_reconnecting = False
        self._reconnection_succeeded = False  # Mark failed reconnection

        # Put error event in queue to notify client
        await self._event_queue.put(
            {
                "type": "error",
                "error": {
                    "type": "connection_lost",
                    "message": "Connection to OpenAI was lost and could not be restored.",
                },
            }
        )

    async def send_event(self, event: Dict[str, Any]) -> None:
        """Send event to OpenAI."""
        if not self.ws or not self.connected:
            raise RuntimeError("WebSocket not connected")

        try:
            await self.ws.send(json.dumps(event))
        except websockets.exceptions.ConnectionClosed as e:
            self.connected = False
            logger.error(f"WebSocket closed while sending event: {e}")
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

    async def force_disconnect(self) -> None:
        """Force disconnect for testing reconnection logic."""
        logger.warning("FORCE DISCONNECT triggered for testing")
        if self.ws:
            try:
                await self.ws.close()
            except Exception:
                pass
        self.connected = False

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
            try:
                await self.ws.close()
                logger.info("Connection closed")
            except Exception as e:
                logger.debug(f"Error closing WebSocket: {e}")
