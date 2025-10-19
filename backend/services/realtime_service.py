"""
OpenAI Realtime API service for bidirectional voice conversation.

This service manages a WebSocket connection to OpenAI's Realtime API,
handling audio input/output and conversation state.
"""

import asyncio
import json
import logging
from typing import AsyncIterator, Optional, Dict, Any, List
import websockets
from websockets.client import WebSocketClientProtocol
import os

logger = logging.getLogger(__name__)


class RealtimeService:
    """
    Manages connection to OpenAI Realtime API for voice conversations.

    Handles:
    - WebSocket connection lifecycle
    - Audio input buffering and transmission
    - Event streaming (transcripts, responses, VAD events)
    - Session configuration
    """

    def __init__(
        self,
        api_key: str,
        model: str = "gpt-realtime",
        voice: str = "alloy",
        instructions: str = "",
    ):
        """
        Initialize Realtime API service.

        Args:
            api_key: OpenAI API key
            model: Model name (gpt-realtime or gpt-realtime-mini)
            voice: Voice for TTS (alloy, echo, fable, onyx, nova, shimmer)
            instructions: System instructions for the conversation
        """
        self.api_key = api_key
        self.model = model
        self.voice = voice
        self.instructions = instructions
        self.ws: Optional[WebSocketClientProtocol] = None
        self.connected = False
        self.session_id: Optional[str] = None
        self._receive_task: Optional[asyncio.Task] = None
        self._event_queue: asyncio.Queue = asyncio.Queue()

    async def connect(self) -> None:
        """Establish WebSocket connection to OpenAI Realtime API."""
        try:
            url = f"wss://api.openai.com/v1/realtime?model={self.model}"

            headers = {
                "Authorization": f"Bearer {self.api_key}",
            }

            logger.info(f"Connecting to OpenAI Realtime API with model {self.model}")
            self.ws = await websockets.connect(
                url,
                additional_headers=headers,
                ping_interval=20,
                ping_timeout=10,
            )
            self.connected = True
            logger.info("Connected to OpenAI Realtime API")

            # Start receiving messages
            self._receive_task = asyncio.create_task(self._receive_loop())

            # Configure session
            await self._configure_session()

        except Exception as e:
            logger.error(f"Failed to connect to OpenAI Realtime API: {e}")
            self.connected = False
            raise

    async def _configure_session(self) -> None:
        """Configure the realtime session with VAD for turn-taking."""
        config = {
            "type": "session.update",
            "session": {
                "type": "session",
                "modalities": ["text", "audio"],
                "instructions": self.instructions,
                "voice": self.voice,
                "input_audio_format": "pcm16",
                "output_audio_format": "pcm16",
                "input_audio_transcription": {
                    "model": "whisper-1"
                },
                "turn_detection": {
                    "type": "server_vad",
                    "threshold": 0.5,
                    "prefix_padding_ms": 300,
                    "silence_duration_ms": 1200
                }
            }
        }

        await self._send_event(config)
        logger.info("Session configured with server VAD (threshold=0.5, silence=1200ms)")

    async def _send_event(self, event: Dict[str, Any]) -> None:
        """Send event to OpenAI Realtime API."""
        if not self.ws or not self.connected:
            raise RuntimeError("WebSocket not connected")

        await self.ws.send(json.dumps(event))

    async def _receive_loop(self) -> None:
        """Continuously receive and queue messages from OpenAI."""
        try:
            if not self.ws:
                return

            async for message in self.ws:
                try:
                    event = json.loads(message)
                    await self._event_queue.put(event)

                    # Log important events
                    event_type = event.get("type", "unknown")
                    if event_type in [
                        "session.updated",
                        "input_audio_buffer.speech_started",
                        "input_audio_buffer.speech_stopped",
                        "response.created",
                        "error",
                    ]:
                        logger.debug(f"OpenAI event: {event_type}")

                except json.JSONDecodeError as e:
                    logger.error(f"Failed to decode OpenAI message: {e}")
                except Exception as e:
                    logger.error(f"Error processing OpenAI message: {e}")

        except websockets.exceptions.ConnectionClosed:
            logger.info("OpenAI WebSocket connection closed")
            self.connected = False
        except Exception as e:
            logger.error(f"Error in receive loop: {e}")
            self.connected = False

    async def append_audio(self, audio_b64: str) -> None:
        """
        Send audio chunk to OpenAI's input buffer.

        Args:
            audio_b64: Base64-encoded PCM16 audio (24kHz mono)
        """
        event = {
            "type": "input_audio_buffer.append",
            "audio": audio_b64,
        }
        await self._send_event(event)

    async def commit_audio(self) -> None:
        """Commit the audio buffer (finalizes user input)."""
        event = {"type": "input_audio_buffer.commit"}
        await self._send_event(event)

    async def create_response(self, instructions: Optional[str] = None) -> None:
        """Request AI to generate a response.

        Args:
            instructions: Optional override instructions for this response only.
        """
        event: Dict[str, Any] = {"type": "response.create"}
        if instructions:
            event["response"] = {"instructions": instructions}
        await self._send_event(event)

    async def cancel_response(self) -> None:
        """Cancel ongoing response generation (for interruptions)."""
        event = {"type": "response.cancel"}
        await self._send_event(event)

    async def aiter_events(self) -> AsyncIterator[Dict[str, Any]]:
        """
        Async iterator over events from OpenAI Realtime API.

        Yields:
            Event dictionaries with various types:
            - session.updated: Session configuration confirmed
            - input_audio_buffer.committed: Audio buffer committed
            - input_audio_buffer.speech_started: User started speaking (VAD)
            - input_audio_buffer.speech_stopped: User stopped speaking (VAD)
            - conversation.item.created: New conversation item
            - response.created: Response generation started
            - response.output_text.delta: Streaming text chunk
            - response.output_text.done: Text generation complete
            - response.output_audio.delta: Streaming audio chunk (PCM16)
            - response.output_audio.done: Audio generation complete
            - response.done: Response fully complete
            - error: Error occurred
        """
        while self.connected or not self._event_queue.empty():
            try:
                event = await asyncio.wait_for(
                    self._event_queue.get(), timeout=0.1
                )
                yield event
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Error iterating events: {e}")
                break

    def get_text_from_event(self, event: Dict[str, Any]) -> Optional[str]:
        """
        Extract text content from event if present.

        Args:
            event: Event dictionary

        Returns:
            Text string or None
        """
        event_type = event.get("type", "")

        if event_type == "response.output_text.delta":
            return event.get("delta", "")

        if event_type == "response.output_text.done":
            return event.get("text", "")

        if event_type == "conversation.item.input_audio_transcription.completed":
            return event.get("transcript", "")

        return None

    def is_speech_started(self, event: Dict[str, Any]) -> bool:
        """Check if event signals user started speaking."""
        return event.get("type") == "input_audio_buffer.speech_started"

    def is_speech_stopped(self, event: Dict[str, Any]) -> bool:
        """Check if event signals user stopped speaking."""
        return event.get("type") == "input_audio_buffer.speech_stopped"

    def is_response_created(self, event: Dict[str, Any]) -> bool:
        """Check if event signals response generation started."""
        return event.get("type") == "response.created"

    def is_response_text_delta(self, event: Dict[str, Any]) -> bool:
        """Check if event contains streaming text."""
        return event.get("type") == "response.output_text.delta"

    def is_response_text_done(self, event: Dict[str, Any]) -> bool:
        """Check if event signals text generation complete."""
        return event.get("type") == "response.output_text.done"

    def is_response_done(self, event: Dict[str, Any]) -> bool:
        """Check if event signals response fully complete."""
        return event.get("type") == "response.done"

    def is_response_audio_delta(self, event: Dict[str, Any]) -> bool:
        """Check if event contains streaming audio."""
        return event.get("type") == "response.output_audio.delta"

    def is_response_audio_done(self, event: Dict[str, Any]) -> bool:
        """Check if event signals audio generation complete."""
        return event.get("type") == "response.output_audio.done"

    def is_error(self, event: Dict[str, Any]) -> bool:
        """Check if event is an error."""
        return event.get("type") == "error"

    def extract_sentences(self, text: str, buffer: str = "") -> List[str]:
        """
        Extract complete sentences from text for streaming to TTS.

        Args:
            text: New text to process
            buffer: Accumulated text buffer from previous calls

        Returns:
            List of complete sentences ready for TTS
        """
        combined = buffer + text
        sentences = []

        # Simple sentence splitting on . ! ?
        import re
        sentence_endings = re.split(r'([.!?]+)', combined)

        i = 0
        while i < len(sentence_endings) - 1:
            sentence = sentence_endings[i] + sentence_endings[i + 1]
            sentences.append(sentence.strip())
            i += 2

        return sentences

    async def close(self) -> None:
        """Close WebSocket connection and cleanup."""
        self.connected = False

        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass

        if self.ws:
            await self.ws.close()
            logger.info("OpenAI Realtime connection closed")
