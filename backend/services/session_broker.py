"""
Session broker orchestrating realtime interview conversation flow.

Coordinates between:
- Client WebSocket (audio input, control messages)
- OpenAI Realtime API (transcription, conversation)
- ElevenLabs TTS (audio output, visemes)
- Latency tracking
"""

import asyncio
import logging
from typing import Optional, Callable, Dict, Any
from dataclasses import dataclass
import time

from services.realtime_service import RealtimeService
from services.tts_service import TTSService
from utils.time import TimingTracker, LatencyMetrics
from models.websocket import (
    TranscriptMessage,
    TTSChunkMessage,
    AnswerEndMessage,
    NoticeMessage,
    ErrorMessage,
    MetricsMessage,
    AlignmentUnit,
)

logger = logging.getLogger(__name__)


@dataclass
class SessionConfig:
    """Configuration for interview session."""

    openai_api_key: str
    openai_model: str
    openai_voice: str
    openai_instructions: str
    elevenlabs_api_key: str
    elevenlabs_voice_id: str
    elevenlabs_model: str
    enable_latency_logging: bool = True


class SessionBroker:
    """
    Orchestrates realtime interview conversation flow.

    Manages:
    - OpenAI Realtime API connection
    - ElevenLabs TTS connection
    - Conversation state
    - Latency tracking
    - Message flow coordination
    """

    def __init__(
        self,
        session_id: str,
        config: SessionConfig,
        send_to_client: Callable,
    ):
        """
        Initialize session broker.

        Args:
            session_id: Unique session identifier
            config: Session configuration
            send_to_client: Async callback to send messages to client
        """
        self.session_id = session_id
        self.config = config
        self.send_to_client = send_to_client

        # Services
        self.realtime: Optional[RealtimeService] = None
        self.tts: Optional[TTSService] = None

        # State
        self.is_running = False
        self.is_speaking = False  # AI is speaking
        self.is_listening = False  # User is speaking

        # Timing
        self.timing_tracker = TimingTracker()

        # Text accumulation for TTS
        self.text_buffer = ""
        self.response_text = ""

        # Tasks
        self._openai_task: Optional[asyncio.Task] = None
        self._tts_task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        """Initialize and start the session."""
        try:
            logger.info(f"Starting session broker: {self.session_id}")

            # Initialize OpenAI Realtime
            self.realtime = RealtimeService(
                api_key=self.config.openai_api_key,
                model=self.config.openai_model,
                voice=self.config.openai_voice,
                instructions=self.config.openai_instructions,
            )
            await self.realtime.connect()

            # Initialize ElevenLabs TTS
            self.tts = TTSService(
                api_key=self.config.elevenlabs_api_key,
                voice_id=self.config.elevenlabs_voice_id,
                model_id=self.config.elevenlabs_model,
            )
            await self.tts.connect()

            self.is_running = True

            # Start processing OpenAI events
            self._openai_task = asyncio.create_task(self._process_openai_events())

            logger.info(f"Session broker started: {self.session_id}")

        except Exception as e:
            logger.error(f"Failed to start session broker: {e}")
            await self.send_to_client(
                ErrorMessage(
                    event="error",
                    code="SESSION_START_FAILED",
                    message=str(e),
                ).model_dump()
            )
            raise

    async def handle_mic_chunk(self, audio_b64: str) -> None:
        """
        Handle incoming audio chunk from client.

        Args:
            audio_b64: Base64-encoded PCM16 audio (24kHz)
        """
        if not self.realtime or not self.is_running:
            return

        try:
            await self.realtime.append_audio(audio_b64)

        except Exception as e:
            logger.error(f"Error handling mic chunk: {e}")

    async def handle_user_turn_end(self) -> None:
        """Handle signal that user has stopped speaking."""
        if not self.realtime or not self.is_running:
            return

        try:
            logger.debug("User turn ended")
            self.timing_tracker.mark_user_speech_end()

            # Commit audio buffer
            await self.realtime.commit_audio()

            # Request AI response
            await self.realtime.create_response()

        except Exception as e:
            logger.error(f"Error handling user turn end: {e}")

    async def handle_barge_in(self) -> None:
        """Handle user interruption during AI speech."""
        if not self.is_running:
            return

        try:
            logger.debug("User barged in")

            # Cancel ongoing TTS
            if self.tts and self.is_speaking:
                await self.tts.clear_queue()
                if self._tts_task:
                    self._tts_task.cancel()

            # Cancel OpenAI response
            if self.realtime:
                await self.realtime.cancel_response()

            self.is_speaking = False
            self.text_buffer = ""
            self.response_text = ""

            await self.send_to_client(
                NoticeMessage(event="notice", msg="Response cancelled").model_dump()
            )

        except Exception as e:
            logger.error(f"Error handling barge-in: {e}")

    async def _process_openai_events(self) -> None:
        """Process events from OpenAI Realtime API."""
        if not self.realtime:
            return

        try:
            async for event in self.realtime.aiter_events():
                if not self.is_running:
                    break

                await self._handle_openai_event(event)

        except Exception as e:
            logger.error(f"Error processing OpenAI events: {e}")

    async def _handle_openai_event(self, event: Dict[str, Any]) -> None:
        """
        Handle individual OpenAI event.

        Args:
            event: Event dictionary from OpenAI
        """
        event_type = event.get("type", "")

        try:
            if event_type == "session.updated":
                logger.debug("OpenAI session updated")

            elif event_type == "input_audio_buffer.speech_started":
                self.is_listening = True
                self.timing_tracker.mark_user_speech_start()
                logger.debug("User speech started (VAD)")

            elif event_type == "input_audio_buffer.speech_stopped":
                self.is_listening = False
                logger.debug("User speech stopped (VAD)")

            elif event_type == "input_audio_buffer.committed":
                logger.debug("Audio buffer committed")

            elif event_type == "response.created":
                logger.debug("AI response creation started")
                self.response_text = ""
                self.text_buffer = ""

            elif event_type == "response.text.delta":
                # Streaming text from AI
                delta = event.get("delta", "")
                await self._handle_text_delta(delta)

            elif event_type == "response.text.done":
                # Complete text response received
                text = event.get("text", "")
                if text:
                    self.response_text += text
                    await self._send_text_to_tts(flush=True)

            elif event_type == "response.done":
                logger.debug("AI response complete")

            elif event_type == "conversation.item.input_audio_transcription.completed":
                # User transcript
                transcript = event.get("transcript", "")
                if transcript:
                    self.timing_tracker.mark_transcript_received()
                    await self.send_to_client(
                        TranscriptMessage(
                            event="transcript",
                            text=transcript,
                            final=True,
                            speaker="user",
                        ).model_dump()
                    )

            elif event_type == "error":
                error_msg = event.get("error", {}).get("message", "Unknown error")
                logger.error(f"OpenAI error: {error_msg}")
                await self.send_to_client(
                    ErrorMessage(
                        event="error",
                        code="OPENAI_ERROR",
                        message=error_msg,
                    ).model_dump()
                )

        except Exception as e:
            logger.error(f"Error handling OpenAI event {event_type}: {e}")

    async def _handle_text_delta(self, delta: str) -> None:
        """
        Handle streaming text chunk from OpenAI.

        Accumulates text and sends complete sentences to TTS.

        Args:
            delta: Text chunk from OpenAI
        """
        self.text_buffer += delta
        self.response_text += delta

        # Extract complete sentences
        sentences = self._extract_sentences(self.text_buffer)

        for sentence in sentences:
            # Remove sentence from buffer
            self.text_buffer = self.text_buffer[len(sentence):].lstrip()

            # Send to TTS
            await self._send_text_to_tts(sentence, flush=False)

    def _extract_sentences(self, text: str) -> list:
        """
        Extract complete sentences from text buffer.

        Args:
            text: Text buffer

        Returns:
            List of complete sentences
        """
        import re

        sentences = []
        # Split on sentence endings
        parts = re.split(r'([.!?]+\s+)', text)

        i = 0
        while i < len(parts) - 1:
            sentence = parts[i] + parts[i + 1]
            if sentence.strip():
                sentences.append(sentence)
            i += 2

        return sentences

    async def _send_text_to_tts(
        self, text: str = "", flush: bool = False
    ) -> None:
        """
        Send text to ElevenLabs TTS and stream audio to client.

        Args:
            text: Text to convert to speech
            flush: If True, signals end of text
        """
        if not self.tts:
            return

        try:
            # Mark timing on first TTS
            if not self.is_speaking:
                self.timing_tracker.mark_tts_request_sent()
                self.is_speaking = True

            # Send text to TTS
            await self.tts.send_text(text, flush=flush)

            # Stream audio chunks to client
            if not self._tts_task or self._tts_task.done():
                self._tts_task = asyncio.create_task(self._stream_tts_audio())

        except Exception as e:
            logger.error(f"Error sending text to TTS: {e}")

    async def _stream_tts_audio(self) -> None:
        """Stream TTS audio chunks to client with alignment data."""
        if not self.tts:
            return

        try:
            first_chunk = True

            async for chunk in self.tts.aiter_audio():
                if not self.is_running:
                    break

                # Mark timing on first chunk
                if first_chunk:
                    self.timing_tracker.mark_tts_first_chunk()
                    self.timing_tracker.mark_playback_start()
                    first_chunk = False

                # Convert alignment format
                align_units = []
                for align in chunk.get("align", []):
                    align_units.append(
                        AlignmentUnit(
                            t=align["t"],
                            d=align["d"],
                            unit=align["unit"],
                            val=align["val"],
                        )
                    )

                # Send to client
                await self.send_to_client(
                    TTSChunkMessage(
                        event="tts_chunk",
                        seq=chunk["seq"],
                        audio_b64=chunk["audio_b64"],
                        align=align_units,
                        is_final=chunk["is_final"],
                    ).model_dump()
                )

                # If final chunk, send answer_end and metrics
                if chunk["is_final"]:
                    self.is_speaking = False
                    await self.send_to_client(
                        AnswerEndMessage(event="answer_end").model_dump()
                    )

                    # Send latency metrics
                    await self._send_metrics()

        except asyncio.CancelledError:
            logger.debug("TTS streaming cancelled")
        except Exception as e:
            logger.error(f"Error streaming TTS audio: {e}")

    async def _send_metrics(self) -> None:
        """Calculate and send latency metrics to client."""
        if not self.config.enable_latency_logging:
            return

        try:
            metrics = self.timing_tracker.calculate_metrics()
            metrics_dict = metrics.to_dict()

            # Convert to milliseconds
            metrics_ms = {
                k: int(v * 1000) if v is not None else None
                for k, v in metrics_dict.items()
            }

            await self.send_to_client(
                MetricsMessage(
                    event="metrics",
                    latency=metrics_ms,
                ).model_dump()
            )

            logger.info(f"Turn latency: {metrics_ms}")

            # Reset timing tracker for next turn
            self.timing_tracker.reset()

        except Exception as e:
            logger.error(f"Error sending metrics: {e}")

    async def stop(self) -> None:
        """Stop the session and cleanup resources."""
        logger.info(f"Stopping session broker: {self.session_id}")
        self.is_running = False

        # Cancel tasks
        if self._openai_task:
            self._openai_task.cancel()
        if self._tts_task:
            self._tts_task.cancel()

        # Close connections
        if self.realtime:
            await self.realtime.close()
        if self.tts:
            await self.tts.close()

        logger.info(f"Session broker stopped: {self.session_id}")
