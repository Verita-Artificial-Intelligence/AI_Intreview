"""
Audio buffering service for server-side audio mixing.

Buffers microphone audio and AI audio chunks with precise timestamps,
enabling synchronized server-side mixing of both streams.
"""

import asyncio
import base64
import binascii
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
        self.server_reference: Optional[float] = None
        self.client_reference: Optional[float] = None
        self.ai_latency_correction: float = 0.12  # seconds
        self._last_mic_ts: Optional[float] = None
        self._last_ai_ts: Optional[float] = None
        self._last_flush_backup: Optional[dict] = None
        self.lock = asyncio.Lock()

        logger.info(f"AudioBuffer initialized: {sample_rate}Hz, {channels} channel(s)")

    async def add_mic_chunk(self, audio_b64: str, seq: int, client_timestamp: Optional[float] = None) -> None:
        """
        Add microphone audio chunk to buffer.

        Args:
            audio_b64: Base64-encoded PCM16 audio data
            seq: Sequence number from client
        """
        async with self.lock:
            if not audio_b64:
                logger.debug("Received empty mic chunk; skipping")
                return

            loop = asyncio.get_running_loop()
            now = loop.time()

            if self.start_time is None:
                self.start_time = now
            if self.server_reference is None:
                self.server_reference = now

            if client_timestamp is not None and self.client_reference is None:
                self.client_reference = client_timestamp

            try:
                audio_data = base64.b64decode(audio_b64)
            except binascii.Error as exc:
                logger.warning(f"Failed to decode mic audio chunk seq={seq}: {exc}")
                return

            if len(audio_data) == 0:
                logger.debug(f"Mic chunk seq={seq} decoded to empty payload; skipping")
                return

            timestamp = now - self.server_reference
            if client_timestamp is not None and self.client_reference is not None:
                candidate = client_timestamp - self.client_reference
                if candidate < -0.05:
                    # Client clock reset; rebase reference
                    logger.debug(
                        f"Client timestamp reset detected (seq={seq}, delta={candidate:.3f}); rebasing reference"
                    )
                    self.client_reference = client_timestamp
                    candidate = 0.0

                if self._last_mic_ts is not None and candidate + 0.05 < self._last_mic_ts:
                    logger.debug(
                        f"Client timestamp drift backward (seq={seq}, candidate={candidate:.3f}); using monotonic fallback"
                    )
                    candidate = self._last_mic_ts

                timestamp = max(0.0, candidate)
            elif self._last_mic_ts is not None:
                timestamp = max(self._last_mic_ts, timestamp)

            chunk = AudioChunk(
                data=audio_data,
                timestamp=timestamp,
                source="mic",
                seq=seq
            )

            self.mic_chunks.append(chunk)
            self._last_mic_ts = timestamp

            logger.debug(f"Buffered mic chunk: seq={seq}, size={len(audio_data)} bytes, ts={timestamp:.3f}s")

    async def add_ai_chunk(self, audio_b64: str, seq: int) -> None:
        """
        Add AI audio chunk to buffer.

        Args:
            audio_b64: Base64-encoded PCM16 audio data from OpenAI
            seq: Internal sequence number
        """
        async with self.lock:
            loop = asyncio.get_running_loop()
            now = loop.time()

            if self.start_time is None:
                self.start_time = now
            if self.server_reference is None:
                self.server_reference = now

            try:
                audio_data = base64.b64decode(audio_b64)
            except binascii.Error as exc:
                logger.warning(f"Failed to decode AI audio chunk seq={seq}: {exc}")
                return

            if len(audio_data) == 0:
                return

            timestamp = now - self.server_reference + self.ai_latency_correction
            if timestamp < 0:
                timestamp = 0.0

            if self._last_ai_ts is not None and timestamp + 0.05 < self._last_ai_ts:
                logger.debug(
                    f"AI timestamp drift backward (seq={seq}, candidate={timestamp:.3f}); using last timestamp"
                )
                timestamp = self._last_ai_ts

            chunk = AudioChunk(
                data=audio_data,
                timestamp=timestamp,
                source="ai",
                seq=seq
            )

            self.ai_chunks.append(chunk)
            self._last_ai_ts = timestamp

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
                    if new_ts + 0.05 < old_ts:
                        logger.debug(
                            f"Ignoring AI timestamp rollback for seq={seq}: old={old_ts:.3f}s, new={new_ts:.3f}s"
                        )
                        return
                    chunk.timestamp = new_ts
                    if self._last_ai_ts is None or new_ts > self._last_ai_ts:
                        self._last_ai_ts = new_ts
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
                duration = asyncio.get_running_loop().time() - reference

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
            mic_sorted = sorted(self.mic_chunks, key=lambda c: c.timestamp)
            ai_sorted = sorted(self.ai_chunks, key=lambda c: c.timestamp)

            self._last_flush_backup = {
                "mic": list(self.mic_chunks),
                "ai": list(self.ai_chunks),
                "start_time": self.start_time,
                "server_reference": self.server_reference,
                "client_reference": self.client_reference,
                "last_mic_ts": self._last_mic_ts,
                "last_ai_ts": self._last_ai_ts,
            }

            self.mic_chunks.clear()
            self.ai_chunks.clear()
            self.start_time = None
            self.server_reference = None
            self.client_reference = None
            self._last_mic_ts = None
            self._last_ai_ts = None

            return mic_sorted, ai_sorted

    async def restore_last_flush(self) -> None:
        """Restore buffered audio from the last flush attempt."""
        async with self.lock:
            if not self._last_flush_backup:
                return

            if not self.mic_chunks and not self.ai_chunks:
                self.mic_chunks.extend(self._last_flush_backup.get("mic", []))
                self.ai_chunks.extend(self._last_flush_backup.get("ai", []))
                self.start_time = self._last_flush_backup.get("start_time")
                self.server_reference = self._last_flush_backup.get("server_reference")
                self.client_reference = self._last_flush_backup.get("client_reference")
                self._last_mic_ts = self._last_flush_backup.get("last_mic_ts")
                self._last_ai_ts = self._last_flush_backup.get("last_ai_ts")

            self._last_flush_backup = None

    async def discard_last_flush_backup(self) -> None:
        """Drop the last flush backup once persistence succeeds."""
        async with self.lock:
            self._last_flush_backup = None

    async def clear(self) -> None:
        """Clear all buffered audio."""
        async with self.lock:
            self.mic_chunks.clear()
            self.ai_chunks.clear()
            self.start_time = None
            self.server_reference = None
            self.client_reference = None
            self._last_mic_ts = None
            self._last_ai_ts = None
            self._last_flush_backup = None
            logger.info("Audio buffer cleared")
