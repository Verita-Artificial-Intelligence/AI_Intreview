"""Timing and latency tracking utilities."""

import time
from typing import Dict, Optional
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class LatencyMetrics:
    """Container for latency measurements."""

    speech_to_transcript: Optional[float] = None
    transcript_to_tts: Optional[float] = None
    tts_to_playback: Optional[float] = None
    total_turn_time: Optional[float] = None

    def to_dict(self) -> Dict[str, Optional[float]]:
        """Convert to dictionary for serialization."""
        return {
            "speech_to_transcript": self.speech_to_transcript,
            "transcript_to_tts": self.transcript_to_tts,
            "tts_to_playback": self.tts_to_playback,
            "total_turn_time": self.total_turn_time,
        }


@dataclass
class TimingTracker:
    """Track timing events for latency measurement."""

    user_speech_start: Optional[float] = None
    user_speech_end: Optional[float] = None
    transcript_received: Optional[float] = None
    tts_request_sent: Optional[float] = None
    tts_first_chunk: Optional[float] = None
    tts_complete: Optional[float] = None
    playback_start: Optional[float] = None

    def mark_user_speech_start(self) -> None:
        """Mark when user starts speaking."""
        self.user_speech_start = time.time()

    def mark_user_speech_end(self) -> None:
        """Mark when user stops speaking."""
        self.user_speech_end = time.time()

    def mark_transcript_received(self) -> None:
        """Mark when transcript is received from OpenAI."""
        self.transcript_received = time.time()

    def mark_tts_request_sent(self) -> None:
        """Mark when TTS request is sent to ElevenLabs."""
        self.tts_request_sent = time.time()

    def mark_tts_first_chunk(self) -> None:
        """Mark when first TTS audio chunk is received."""
        self.tts_first_chunk = time.time()

    def mark_tts_complete(self) -> None:
        """Mark when TTS generation is complete."""
        self.tts_complete = time.time()

    def mark_playback_start(self) -> None:
        """Mark when audio playback starts."""
        self.playback_start = time.time()

    def calculate_metrics(self) -> LatencyMetrics:
        """
        Calculate latency metrics from tracked timings.

        Returns:
            LatencyMetrics object with calculated values
        """
        metrics = LatencyMetrics()

        # Speech to transcript latency
        if self.user_speech_end and self.transcript_received:
            metrics.speech_to_transcript = (
                self.transcript_received - self.user_speech_end
            )

        # Transcript to TTS latency
        if self.transcript_received and self.tts_first_chunk:
            metrics.transcript_to_tts = self.tts_first_chunk - self.transcript_received

        # TTS to playback latency
        if self.tts_first_chunk and self.playback_start:
            metrics.tts_to_playback = self.playback_start - self.tts_first_chunk

        # Total turn time
        if self.user_speech_end and self.playback_start:
            metrics.total_turn_time = self.playback_start - self.user_speech_end

        return metrics

    def reset(self) -> None:
        """Reset all timings."""
        self.user_speech_start = None
        self.user_speech_end = None
        self.transcript_received = None
        self.tts_request_sent = None
        self.tts_first_chunk = None
        self.tts_complete = None
        self.playback_start = None


def get_timestamp_ms() -> int:
    """
    Get current timestamp in milliseconds.

    Returns:
        Current timestamp as integer milliseconds since epoch
    """
    return int(time.time() * 1000)


def format_duration(seconds: float) -> str:
    """
    Format duration in seconds to human-readable string.

    Args:
        seconds: Duration in seconds

    Returns:
        Formatted string (e.g., "1.23s" or "456ms")
    """
    if seconds >= 1.0:
        return f"{seconds:.2f}s"
    else:
        return f"{int(seconds * 1000)}ms"
