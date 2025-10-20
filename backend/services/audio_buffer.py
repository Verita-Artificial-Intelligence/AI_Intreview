"""
Audio buffering service for server-side audio mixing.

Buffers microphone audio and AI audio chunks with precise timestamps,
enabling synchronized server-side mixing of both streams.
"""

import asyncio
import base64
import logging
from typing import List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


@dataclass
class AudioChunk:
    """Represents a single audio chunk with metadata."""
    data: bytes  # PCM16 audio data
    timestamp: float  # Relative timestamp in seconds since session start
    source: str  # "mic" or "ai"
    seq: int  # Sequence number


class AudioBuffer:
    """
    Buffers audio chunks from multiple sources for server-side mixing.

    Handles microphone input and AI-generated audio, maintaining temporal
    alignment for accurate mixing.
    """

    def __init__(self, sample_rate: int = 24000, channels: int = 1):
        """
        Initialize audio buffer.

        Args:
            sample_rate: Sample rate in Hz (default 24kHz for OpenAI Realtime)
            channels: Number of audio channels (default 1 for mono)
        """
        self.sample_rate = sample_rate
        self.channels = channels
        self.mic_chunks: List[AudioChunk] = []
        self.ai_chunks: List[AudioChunk] = []
        self.start_time: Optional[float] = None
        self.lock = asyncio.Lock()

        logger.info(f"AudioBuffer initialized: {sample_rate}Hz, {channels} channel(s)")

    async def add_mic_chunk(self, audio_b64: str, seq: int) -> None:
        """
        Add microphone audio chunk to buffer.

        Args:
            audio_b64: Base64-encoded PCM16 audio data
            seq: Sequence number from client
        """
        async with self.lock:
            # Initialize start time on first chunk
            if self.start_time is None:
                self.start_time = asyncio.get_event_loop().time()

            # Decode audio data
            audio_data = base64.b64decode(audio_b64)

            # Calculate timestamp relative to session start
            timestamp = asyncio.get_event_loop().time() - self.start_time

            chunk = AudioChunk(
                data=audio_data,
                timestamp=timestamp,
                source="mic",
                seq=seq
            )

            self.mic_chunks.append(chunk)

            logger.debug(f"Buffered mic chunk: seq={seq}, size={len(audio_data)} bytes, ts={timestamp:.3f}s")

    async def add_ai_chunk(self, audio_b64: str, seq: int) -> None:
        """
        Add AI audio chunk to buffer.

        Args:
            audio_b64: Base64-encoded PCM16 audio data from OpenAI
            seq: Internal sequence number
        """
        async with self.lock:
            # Initialize start time on first chunk
            if self.start_time is None:
                self.start_time = asyncio.get_event_loop().time()

            # Decode audio data
            audio_data = base64.b64decode(audio_b64)

            # Skip empty chunks
            if len(audio_data) == 0:
                return

            # Calculate timestamp relative to session start
            timestamp = asyncio.get_event_loop().time() - self.start_time

            chunk = AudioChunk(
                data=audio_data,
                timestamp=timestamp,
                source="ai",
                seq=seq
            )

            self.ai_chunks.append(chunk)

            logger.debug(f"Buffered AI chunk: seq={seq}, size={len(audio_data)} bytes, ts={timestamp:.3f}s")

    async def get_stats(self) -> dict:
        """
        Get buffer statistics.

        Returns:
            Dictionary with buffer stats
        """
        async with self.lock:
            mic_bytes = sum(len(chunk.data) for chunk in self.mic_chunks)
            ai_bytes = sum(len(chunk.data) for chunk in self.ai_chunks)

            duration = 0.0
            if self.start_time is not None:
                duration = asyncio.get_event_loop().time() - self.start_time

            return {
                "mic_chunks": len(self.mic_chunks),
                "ai_chunks": len(self.ai_chunks),
                "mic_bytes": mic_bytes,
                "ai_bytes": ai_bytes,
                "duration_seconds": duration,
                "sample_rate": self.sample_rate,
                "channels": self.channels
            }

    async def flush(self) -> Tuple[List[AudioChunk], List[AudioChunk]]:
        """
        Flush and return all buffered audio chunks.

        Returns:
            Tuple of (mic_chunks, ai_chunks), sorted by timestamp
        """
        async with self.lock:
            # Sort chunks by timestamp
            mic_sorted = sorted(self.mic_chunks, key=lambda c: c.timestamp)
            ai_sorted = sorted(self.ai_chunks, key=lambda c: c.timestamp)

            stats = {
                "mic_chunks": len(mic_sorted),
                "ai_chunks": len(ai_sorted),
                "mic_bytes": sum(len(c.data) for c in mic_sorted),
                "ai_bytes": sum(len(c.data) for c in ai_sorted)
            }

            logger.info(f"Flushing audio buffer: {stats}")

            # Clear buffers
            mic_result = self.mic_chunks.copy()
            ai_result = self.ai_chunks.copy()

            self.mic_chunks.clear()
            self.ai_chunks.clear()

            return mic_result, ai_result

    async def clear(self) -> None:
        """Clear all buffered audio."""
        async with self.lock:
            self.mic_chunks.clear()
            self.ai_chunks.clear()
            self.start_time = None
            logger.info("Audio buffer cleared")
