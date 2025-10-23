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
    rms: Optional[float] = None  # Normalized RMS level (0.0-1.0)
    is_speech: Optional[bool] = None  # True when chunk likely contains speech


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
        self.server_reference: Optional[float] = None
        self.client_reference: Optional[float] = None
        self.ai_latency_correction: float = 0.12  # seconds
        self.lock = asyncio.Lock()

        logger.info(f"AudioBuffer initialized: {sample_rate}Hz, {channels} channel(s)")

    async def add_mic_chunk(
        self,
        audio_b64: str,
        seq: int,
        client_timestamp: Optional[float] = None,
        *,
        audio_bytes: Optional[bytes] = None,
        rms: Optional[float] = None,
        is_speech: Optional[bool] = None,
    ) -> None:
        """
        Add microphone audio chunk to buffer.

        Args:
            audio_b64: Base64-encoded PCM16 audio data
            seq: Sequence number from client
        """
        async with self.lock:
            # Initialize start time on first chunk
            loop = asyncio.get_event_loop()
            now = loop.time()

            if self.start_time is None:
                self.start_time = now
            if self.server_reference is None:
                self.server_reference = now
            if client_timestamp is not None and self.client_reference is None:
                self.client_reference = client_timestamp

            # Decode audio data (use provided bytes when available to avoid duplicate work)
            audio_data = audio_bytes if audio_bytes is not None else base64.b64decode(audio_b64)

            # Calculate timestamp relative to session start
            if client_timestamp is not None and self.client_reference is not None:
                timestamp = max(0.0, client_timestamp - self.client_reference)
            else:
                timestamp = now - self.server_reference

            chunk = AudioChunk(
                data=audio_data,
                timestamp=timestamp,
                source="mic",
                seq=seq,
                rms=rms,
                is_speech=is_speech,
            )

            self.mic_chunks.append(chunk)

            if logger.isEnabledFor(logging.DEBUG):
                logger.debug(
                    "Buffered mic chunk: seq=%s, size=%s bytes, ts=%.3fs, rms=%s, speech=%s",
                    seq,
                    len(audio_data),
                    timestamp,
                    f"{rms:.4f}" if rms is not None else "n/a",
                    is_speech,
                )

    async def add_ai_chunk(self, audio_b64: str, seq: int) -> None:
        """
        Add AI audio chunk to buffer.

        Args:
            audio_b64: Base64-encoded PCM16 audio data from OpenAI
            seq: Internal sequence number
        """
        async with self.lock:
            # Initialize start time on first chunk
            loop = asyncio.get_event_loop()
            now = loop.time()

            if self.start_time is None:
                self.start_time = now
            if self.server_reference is None:
                self.server_reference = now

            # Decode audio data
            audio_data = base64.b64decode(audio_b64)

            # Skip empty chunks
            if len(audio_data) == 0:
                return

            # Calculate timestamp relative to session start
            timestamp = now - self.server_reference + self.ai_latency_correction
            if timestamp < 0:
                timestamp = 0.0

            chunk = AudioChunk(
                data=audio_data,
                timestamp=timestamp,
                source="ai",
                seq=seq,
            )

            self.ai_chunks.append(chunk)

            logger.debug(f"Buffered AI chunk: seq={seq}, size={len(audio_data)} bytes, ts={timestamp:.3f}s")

    async def update_ai_timestamp(self, seq: int, client_timestamp: float) -> None:
        """
        Update the timestamp of an AI chunk using client playback timing.

        Args:
            seq: Sequence number of the AI chunk
            client_timestamp: Playback start time reported by client (seconds since session start)
        """
        async with self.lock:
            for chunk in self.ai_chunks:
                if chunk.seq == seq:
                    new_ts = max(0.0, client_timestamp)
                    old_ts = chunk.timestamp
                    chunk.timestamp = new_ts
                    logger.debug(
                        f"Updated AI chunk timestamp: seq={seq}, old={old_ts:.3f}s -> new={new_ts:.3f}s"
                    )
                    return

            logger.debug(f"Received AI timestamp update for unknown seq={seq}")

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
            reference = self.server_reference or self.start_time
            if reference is not None:
                duration = asyncio.get_event_loop().time() - reference

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
            # Sort chunks by timestamp before returning
            mic_sorted = sorted(self.mic_chunks, key=lambda c: c.timestamp)
            ai_sorted = sorted(self.ai_chunks, key=lambda c: c.timestamp)
            
            # Clear the buffer after copying the data
            self.mic_chunks.clear()
            self.ai_chunks.clear()

            return mic_sorted, ai_sorted

    async def clear(self) -> None:
        """Clear all buffered audio."""
        async with self.lock:
            self.mic_chunks.clear()
            self.ai_chunks.clear()
            self.start_time = None
            self.server_reference = None
            self.client_reference = None
            logger.info("Audio buffer cleared")
