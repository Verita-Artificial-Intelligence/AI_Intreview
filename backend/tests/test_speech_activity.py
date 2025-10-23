import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from services.speech_activity import SpeechActivityMonitor, pcm16_rms  # noqa: E402


def make_pcm16(amplitude: int, samples: int = 2400) -> bytes:
    """Helper to create constant PCM16 audio chunks."""
    return b"".join(int(amplitude).to_bytes(2, "little", signed=True) for _ in range(samples))


def test_pcm16_rms_handles_silence_and_constant_signal():
    silence = make_pcm16(0)
    assert pcm16_rms(silence) == 0.0

    quarter_scale = make_pcm16(int(0.25 * 32767))
    assert pcm16_rms(quarter_scale) == pytest.approx(0.25, rel=1e-2)


def test_speech_activity_monitor_requires_speech_and_silence_before_commit():
    monitor = SpeechActivityMonitor(
        chunk_ms=100,
        speech_threshold=0.02,
        min_speech_ms=200,
        min_silence_ms=300,
        release_guard_ms=150,
    )

    base = 1000.0
    speech_chunk = make_pcm16(int(0.06 * 32767))
    near_threshold_chunk = make_pcm16(int(0.015 * 32767))
    silence_chunk = make_pcm16(0)

    rms, is_speech = monitor.register_chunk(speech_chunk, now=base)
    assert is_speech
    assert rms > monitor.speech_threshold
    assert monitor.speech_ms == 100

    rms_near, is_speech_near = monitor.register_chunk(near_threshold_chunk, now=base + 0.1)
    assert is_speech_near  # hysteresis keeps the turn active
    assert rms_near < monitor.speech_threshold
    assert monitor.speech_ms == 200
    assert not monitor.can_commit(now=base + 0.2)

    assert monitor.register_false_turn() == 1
    assert monitor.false_turns == 1

    # Provide sustained silence to satisfy the release window
    for idx in range(3):
        monitor.register_chunk(silence_chunk, now=base + 0.3 + (idx * 0.1))

    assert monitor.can_commit(now=base + 0.6)

    monitor.mark_commit_success()
    assert monitor.false_turns == 0
    assert monitor.speech_ms == 0
    assert not monitor.has_speech()
