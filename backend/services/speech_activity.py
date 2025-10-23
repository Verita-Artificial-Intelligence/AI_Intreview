"""
Speech activity tracking and lightweight noise gating helpers.
"""

from __future__ import annotations

import math
import time
from typing import Optional, Tuple


def pcm16_rms(audio_bytes: bytes) -> float:
    """
    Compute the root-mean-square amplitude for PCM16 mono audio.

    Args:
        audio_bytes: Raw PCM16 audio samples.

    Returns:
        float: Normalized RMS value between 0.0 and 1.0.
    """
    if not audio_bytes:
        return 0.0

    sample_count = len(audio_bytes) // 2
    if sample_count == 0:
        return 0.0

    # Sum of squares for each 16-bit sample
    total = 0.0
    mv = memoryview(audio_bytes)
    for idx in range(0, len(mv), 2):
        sample = int.from_bytes(mv[idx : idx + 2], "little", signed=True)
        total += float(sample * sample)

    mean = total / sample_count
    return math.sqrt(mean) / 32768.0


class SpeechActivityMonitor:
    """
    Track speech activity across microphone chunks to smooth VAD decisions.

    Maintains a minimal amount of state so the backend can double-check whether
    speech actually occurred and whether we have observed sustained silence
    before committing audio to OpenAI.
    """

    def __init__(
        self,
        *,
        chunk_ms: int = 100,
        speech_threshold: float = 0.02,
        min_speech_ms: int = 300,
        min_silence_ms: int = 600,
        release_guard_ms: Optional[int] = None,
    ):
        self.chunk_ms = max(10, chunk_ms)
        self.speech_threshold = max(0.0, speech_threshold)
        self.min_speech_ms = max(self.chunk_ms, min_speech_ms)
        self.min_silence_ms = max(self.chunk_ms, min_silence_ms)
        self.release_guard_ms = (
            release_guard_ms if release_guard_ms is not None else max(self.chunk_ms, 200)
        )

        self._false_turns = 0
        self._last_rms = 0.0
        self.reset_turn()

    def reset_turn(self) -> None:
        """Clear per-turn speech metrics while keeping adaptive history."""
        self._turn_started = False
        self._turn_speech_ms = 0
        self._consecutive_silence_ms = 0
        self._last_speech_time: Optional[float] = None
        self._last_chunk_time: Optional[float] = None

    def mark_commit_success(self) -> None:
        """Reset counters after a confirmed turn commit."""
        self.reset_turn()
        self._false_turns = 0

    def register_false_turn(self) -> int:
        """
        Track a VAD decision that failed backend validation.

        Returns:
            int: Updated false turn count.
        """
        self._false_turns += 1
        return self._false_turns

    @property
    def false_turns(self) -> int:
        """Current count of consecutive rejected turn commits."""
        return self._false_turns

    @property
    def last_rms(self) -> float:
        """RMS value for the most recent chunk."""
        return self._last_rms

    @property
    def speech_ms(self) -> int:
        """Accumulated speech duration observed in the current turn."""
        return self._turn_speech_ms

    def reset_false_turns(self) -> None:
        """Clear the false-turn counter without altering turn state."""
        self._false_turns = 0

    def current_silence_ms(self, now: Optional[float] = None) -> int:
        """
        Amount of continuous silence observed since the last speech.

        Args:
            now: Optional monotonic timestamp for deterministic testing.

        Returns:
            int: Silence duration in milliseconds.
        """
        if self._last_speech_time is None:
            return self._consecutive_silence_ms

        now_ts = now if now is not None else time.monotonic()
        observed = int((now_ts - self._last_speech_time) * 1000)
        return max(self._consecutive_silence_ms, observed)

    def has_speech(self) -> bool:
        """Whether any speech has been detected this turn."""
        return self._turn_started and self._turn_speech_ms > 0

    def register_chunk(self, audio_bytes: bytes, *, now: Optional[float] = None) -> Tuple[float, bool]:
        """
        Update activity metrics using a new microphone chunk.

        Args:
            audio_bytes: Raw PCM16 audio chunk.

        Returns:
            Tuple[float, bool]: (RMS amplitude, True when chunk contains speech)
        """
        now_ts = now if now is not None else time.monotonic()
        rms = pcm16_rms(audio_bytes)
        self._last_rms = rms

        is_speech = self._is_speech(rms, now_ts)
        self._last_chunk_time = now_ts

        if is_speech:
            self._turn_started = True
            self._turn_speech_ms += self.chunk_ms
            self._consecutive_silence_ms = 0
            self._last_speech_time = now_ts
        else:
            self._consecutive_silence_ms = min(
                self._consecutive_silence_ms + self.chunk_ms,
                self.min_silence_ms * 4,
            )

        return rms, is_speech

    def _is_speech(self, rms: float, now: float) -> bool:
        """Decision helper that adds a small hysteresis window."""
        if rms >= self.speech_threshold:
            return True
        if self._last_speech_time is None:
            return False

        elapsed_ms = int((now - self._last_speech_time) * 1000)
        # Allow quick fallbacks so we do not chop syllables mid-word.
        return elapsed_ms <= self.release_guard_ms and rms >= (self.speech_threshold * 0.6)

    def can_commit(self, now: Optional[float] = None) -> bool:
        """
        Determine whether we should finalize the current turn.

        Args:
            now: Optional monotonic timestamp for deterministic testing.

        Returns:
            bool: True if minimum speech and silence thresholds are satisfied.
        """
        if not self.has_speech():
            return False

        if self._turn_speech_ms < self.min_speech_ms:
            return False

        silence_ms = self.current_silence_ms(now)
        return silence_ms >= self.min_silence_ms
