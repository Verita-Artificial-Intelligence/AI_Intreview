"""
Mock ElevenLabs TTS service for development and testing.

This mock generates silent audio without making actual API calls,
allowing for cost-free development.
"""

import asyncio
import base64
import logging
from typing import AsyncIterator, Optional, Dict, Any, List

logger = logging.getLogger(__name__)


class MockTTSService:
    """
    Mock implementation of ElevenLabs TTS service.

    Simulates realistic behavior including:
    - Audio chunk generation (silent audio)
    - Streaming behavior with proper timing
    """

    def __init__(
        self,
        api_key: str,
        voice_id: str,
        model_id: str = "eleven_flash_v2_5",
        output_format: str = "mp3_44100_128",
    ):
        """
        Initialize Mock ElevenLabs TTS service.

        Args:
            api_key: ElevenLabs API key (not used in mock)
            voice_id: Voice ID (not used in mock)
            model_id: Model ID (not used in mock)
            output_format: Output format (not used in mock)
        """
        self.api_key = api_key
        self.voice_id = voice_id
        self.model_id = model_id
        self.output_format = output_format
        self.connected = False
        self._audio_queue: asyncio.Queue = asyncio.Queue()
        self._receive_task: Optional[asyncio.Task] = None
        self._chunk_seq = 0
        self._text_buffer = ""

    async def connect(self) -> None:
        """Simulate WebSocket connection to ElevenLabs."""
        try:
            logger.info(f"[MOCK] Connecting to ElevenLabs TTS (voice: {self.voice_id})")

            # Simulate connection delay
            await asyncio.sleep(0.1)

            self.connected = True
            logger.info("[MOCK] Connected to ElevenLabs TTS")

            # No receive loop needed for mock
        except Exception as e:
            logger.error(f"[MOCK] Failed to connect to ElevenLabs: {e}")
            self.connected = False
            raise

    async def send_text(self, text: str, flush: bool = False) -> None:
        """
        Simulate sending text to ElevenLabs for TTS generation.

        Args:
            text: Text to convert to speech
            flush: If True, signals end of text input (triggers generation)
        """
        if not self.connected:
            raise RuntimeError("Mock WebSocket not connected")

        # Always buffer incoming text first
        if text:
            self._text_buffer += text
            logger.debug(f"[MOCK] Buffered text: {text[:50]}...")

        if flush:
            # Generate audio for all buffered text
            if self._text_buffer:
                logger.info(f"[MOCK] Generating TTS for: '{self._text_buffer[:80]}'")
                await self._generate_audio_chunks(self._text_buffer)
                self._text_buffer = ""

            # Send final message
            await self._audio_queue.put({
                "isFinal": True,
                "audio": "",
            })

            logger.debug("[MOCK] Sent flush signal to ElevenLabs")

    async def _generate_audio_chunks(self, text: str) -> None:
        """
        Generate mock audio chunks.

        Args:
            text: Text to generate audio for
        """
        # Calculate approximate duration (0.08 seconds per character)
        total_duration = len(text) * 0.08

        # Split into chunks (simulate ~200ms chunks)
        chunk_duration = 0.2  # 200ms
        num_chunks = max(1, int(total_duration / chunk_duration))

        for i in range(num_chunks):
            # Generate silent audio chunk
            audio_b64 = self._generate_silent_audio(chunk_duration)

            # Queue chunk
            await self._audio_queue.put({
                "audio": audio_b64,
                "isFinal": False,
            })

            # Simulate streaming delay
            await asyncio.sleep(0.05)

    def _generate_silent_audio(self, duration: float) -> str:
        """
        Generate silent audio data (base64 encoded).

        Args:
            duration: Duration of audio in seconds

        Returns:
            Base64-encoded silent audio
        """
        # Generate minimal silent MP3 header (simplified)
        # In a real implementation, this would be a proper MP3 frame
        # For mock purposes, we return a simple base64 string

        # Calculate approximate size (44100 Hz * duration * 2 bytes per sample)
        sample_count = int(44100 * duration)
        silence_bytes = bytes(sample_count * 2)  # 16-bit samples

        return base64.b64encode(silence_bytes).decode("utf-8")

    async def aiter_audio(self) -> AsyncIterator[Dict[str, Any]]:
        """
        Async iterator over audio chunks from mock ElevenLabs.

        Yields:
            Dictionaries with:
            - audio_b64: Base64-encoded audio chunk
            - is_final: Boolean indicating if this is the last chunk
            - seq: Sequence number
        """
        while self.connected or not self._audio_queue.empty():
            try:
                data = await asyncio.wait_for(
                    self._audio_queue.get(), timeout=0.1
                )

                audio_b64 = data.get("audio", "")
                is_final = data.get("isFinal", False)

                if audio_b64 or is_final:
                    yield {
                        "audio_b64": audio_b64,
                        "is_final": is_final,
                        "seq": self._chunk_seq,
                    }
                    self._chunk_seq += 1

                    if is_final:
                        break

            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"[MOCK] Error iterating audio chunks: {e}")
                break

    async def clear_queue(self) -> None:
        """Clear pending audio chunks (for interruptions)."""
        while not self._audio_queue.empty():
            try:
                self._audio_queue.get_nowait()
            except asyncio.QueueEmpty:
                break

        self._text_buffer = ""
        logger.debug("[MOCK] Cleared ElevenLabs audio queue")

    async def close(self) -> None:
        """Close mock connection and cleanup."""
        self.connected = False

        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass

        logger.info("[MOCK] ElevenLabs TTS connection closed")

    def reset_sequence(self) -> None:
        """Reset chunk sequence counter (for new responses)."""
        self._chunk_seq = 0
