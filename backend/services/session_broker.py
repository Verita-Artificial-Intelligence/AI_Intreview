"""
Session broker orchestrating realtime interview conversation flow.

Coordinates between:
- Client WebSocket (audio input, control messages)
- OpenAI Realtime API (transcription, conversation, TTS audio output)
- Latency tracking
"""

import asyncio
import logging
from typing import Optional, Callable, Dict, Any
from dataclasses import dataclass
import time

from services.factory import get_realtime_service
from utils.time import TimingTracker, LatencyMetrics
from models.websocket import (
    TranscriptMessage,
    TTSChunkMessage,
    AnswerEndMessage,
    NoticeMessage,
    ErrorMessage,
    MetricsMessage,
)

logger = logging.getLogger(__name__)


@dataclass
class SessionConfig:
    """Configuration for interview session."""

    openai_api_key: str
    openai_model: str
    openai_voice: str
    openai_instructions: str
    enable_latency_logging: bool = True
    auto_greet: bool = True


class SessionBroker:
    """
    Orchestrates realtime interview conversation flow.

    Manages:
    - OpenAI Realtime API connection (STT, conversation, TTS)
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

        # State
        self.is_running = False
        self.is_speaking = False  # AI is speaking
        self.is_listening = False  # User is speaking

        # Timing
        self.timing_tracker = TimingTracker()

        # Audio sequence tracking
        self.audio_seq = 0

        # Silence detection and backoff
        self.silence_check_delays = [2, 4, 8, 16, 32]  # seconds
        self.current_silence_check_index = 0
        self.silence_timer_task: Optional[asyncio.Task] = None
        self.last_user_speech_time: Optional[float] = None

        # Tasks
        self._openai_task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        """Initialize and start the session."""
        try:
            logger.info(f"Starting session broker: {self.session_id}")

            # Initialize OpenAI Realtime (real or mock based on config)
            self.realtime = get_realtime_service(
                api_key=self.config.openai_api_key,
                model=self.config.openai_model,
                voice=self.config.openai_voice,
                instructions=self.config.openai_instructions,
            )
            await self.realtime.connect()

            self.is_running = True

            # Start processing OpenAI events
            self._openai_task = asyncio.create_task(self._process_openai_events())

            # Optionally auto-start the conversation with a short greeting
            if self.config.auto_greet:
                await asyncio.sleep(0.5)  # Ensure session is fully ready
                # Force a focused first question rather than a generic greeting
                first_turn_instructions = (
                    "Start the interview with a concise, role-relevant first question. "
                    "Avoid generic acknowledgements or offering broad help."
                )
                await self.realtime.create_response(instructions=first_turn_instructions)

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

            # Note: With server_vad enabled, the server automatically creates responses
            # when it detects the user has stopped speaking. No need to manually trigger.
            # Only uncomment below if turn_detection is disabled:
            # await self.realtime.create_response()

        except Exception as e:
            logger.error(f"Error handling user turn end: {e}")

    async def handle_barge_in(self) -> None:
        """Handle user interruption during AI speech."""
        if not self.is_running:
            return

        try:
            logger.debug("User barged in")

            # Cancel OpenAI response (this also stops audio generation)
            if self.realtime:
                await self.realtime.cancel_response()

            self.is_speaking = False

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
                self.last_user_speech_time = time.time()
                logger.debug("User speech started (VAD)")

                # Cancel any pending silence check
                self._cancel_silence_timer()
                self.current_silence_check_index = 0

                # If AI is currently speaking and the user starts speaking,
                # treat this as a barge-in and cancel the ongoing response.
                if self.is_speaking and self.realtime:
                    try:
                        await self.realtime.cancel_response()
                        self.is_speaking = False
                        await self.send_to_client(
                            NoticeMessage(event="notice", msg="Response cancelled (barge-in)").model_dump()
                        )
                    except Exception as e:
                        logger.error(f"Error cancelling response on barge-in: {e}")

            elif event_type == "input_audio_buffer.speech_stopped":
                self.is_listening = False
                logger.debug("User speech stopped (VAD)")
                # User has stopped talking, start a timer to check if they've gone silent.
                # This will be cancelled if the AI starts generating a response.
                self._start_silence_timer()

            elif event_type == "input_audio_buffer.committed":
                logger.debug("Audio buffer committed")

            elif event_type == "response.created":
                logger.debug("AI response creation started")
                self.audio_seq = 0
                # AI is about to speak, cancel any pending silence check.
                self._cancel_silence_timer()

            elif event_type == "response.output_audio.delta":
                # Streaming audio from OpenAI
                audio_b64 = event.get("delta", "")
                if audio_b64:
                    await self._handle_audio_delta(audio_b64)

            elif event_type == "response.output_audio.done":
                # Audio generation complete
                logger.debug("Audio generation complete")
                await self._handle_audio_done()

            elif event_type == "response.done":
                logger.debug("AI response complete")
                
                # Start silence detection timer after AI finishes speaking
                self._start_silence_timer()

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

    async def _handle_audio_delta(self, audio_b64: str) -> None:
        """
        Handle streaming audio chunk from OpenAI.

        Args:
            audio_b64: Base64-encoded PCM16 audio chunk
        """
        try:
            # Mark timing on first audio chunk
            if not self.is_speaking:
                self.timing_tracker.mark_tts_request_sent()
                self.timing_tracker.mark_tts_first_chunk()
                self.timing_tracker.mark_playback_start()
                self.is_speaking = True

            # Send audio chunk to client
            tts_msg = TTSChunkMessage(
                event="tts_chunk",
                seq=self.audio_seq,
                audio_b64=audio_b64,
                is_final=False,
            ).model_dump()

            await self.send_to_client(tts_msg)
            self.audio_seq += 1

        except Exception as e:
            logger.error(f"Error handling audio delta: {e}")

    async def _handle_audio_done(self) -> None:
        """Handle completion of audio generation."""
        try:
            self.is_speaking = False

            # Send final empty chunk to signal end
            tts_msg = TTSChunkMessage(
                event="tts_chunk",
                seq=self.audio_seq,
                audio_b64="",
                is_final=True,
            ).model_dump()
            await self.send_to_client(tts_msg)

            # Send answer_end message
            await self.send_to_client(
                AnswerEndMessage(event="answer_end").model_dump()
            )

            # Send latency metrics
            await self._send_metrics()

        except Exception as e:
            logger.error(f"Error handling audio done: {e}")

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

    def _start_silence_timer(self) -> None:
        """Start or restart the silence detection timer."""
        self._cancel_silence_timer()
        
        if self.current_silence_check_index < len(self.silence_check_delays):
            delay = self.silence_check_delays[self.current_silence_check_index]
            self.silence_timer_task = asyncio.create_task(self._silence_check(delay))
            logger.debug(f"Started silence timer: {delay}s (check #{self.current_silence_check_index + 1})")

    def _cancel_silence_timer(self) -> None:
        """Cancel any pending silence timer."""
        if self.silence_timer_task and not self.silence_timer_task.done():
            self.silence_timer_task.cancel()
            self.silence_timer_task = None

    async def _silence_check(self, delay: float) -> None:
        """Check for user silence after a delay and prompt if needed."""
        try:
            await asyncio.sleep(delay)
            
            if not self.is_running or self.is_speaking or self.is_listening:
                return

            # User hasn't spoken for the delay period
            check_num = self.current_silence_check_index + 1
            total_checks = len(self.silence_check_delays)
            
            logger.info(f"Silence detected after {delay}s (check {check_num}/{total_checks})")

            if self.current_silence_check_index >= len(self.silence_check_delays) - 1:
                # Final check - end the interview
                logger.info("Max silence reached, ending interview")
                await self.send_to_client(
                    NoticeMessage(
                        event="notice",
                        msg="Interview ended due to inactivity",
                        level="info"
                    ).model_dump()
                )
                await self.stop()
            else:
                # Send a check-in prompt
                check_in_instructions = self._get_checkin_instruction(check_num, total_checks)
                if self.realtime:
                    await self.realtime.create_response(instructions=check_in_instructions)
                
                # Move to next backoff level
                self.current_silence_check_index += 1

        except asyncio.CancelledError:
            logger.debug("Silence timer cancelled")
        except Exception as e:
            logger.error(f"Error in silence check: {e}")

    def _get_checkin_instruction(self, check_num: int, total_checks: int) -> str:
        """Get appropriate check-in instruction based on silence duration."""
        if check_num == 1:
            return (
                "The candidate hasn't responded. Check in briefly: "
                "'Are you still there?' or 'Can you hear me?' Keep it very short."
            )
        elif check_num == 2:
            return (
                "Still no response. Ask if they need a moment or if there are technical issues. "
                "Be understanding and brief."
            )
        elif check_num == 3:
            return (
                "Extended silence. Ask if they'd like to continue the interview or if "
                "they need to reschedule. Keep it professional and brief."
            )
        else:
            return (
                "Very long silence. Make a final check: 'I haven't heard from you. "
                "Should we end the interview for now?' Be brief and direct."
            )

    async def stop(self) -> None:
        """Stop the session and cleanup resources."""
        logger.info(f"Stopping session broker: {self.session_id}")
        self.is_running = False

        # Cancel timers
        self._cancel_silence_timer()

        # Cancel tasks
        if self._openai_task:
            self._openai_task.cancel()

        # Close connections
        if self.realtime:
            await self.realtime.close()

        logger.info(f"Session broker stopped: {self.session_id}")
