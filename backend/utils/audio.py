"""Audio processing utilities for realtime interview system."""

import base64
import struct
from typing import List


def pcm16_to_base64(pcm_data: bytes) -> str:
    """
    Convert PCM16 audio data to base64 string.

    Args:
        pcm_data: Raw PCM16 audio bytes

    Returns:
        Base64 encoded string
    """
    return base64.b64encode(pcm_data).decode("utf-8")


def base64_to_pcm16(b64_string: str) -> bytes:
    """
    Convert base64 string to PCM16 audio data.

    Args:
        b64_string: Base64 encoded audio string

    Returns:
        Raw PCM16 audio bytes
    """
    return base64.b64decode(b64_string)


def chunk_audio(audio_data: bytes, chunk_size_bytes: int) -> List[bytes]:
    """
    Split audio data into fixed-size chunks.

    Args:
        audio_data: Raw audio bytes
        chunk_size_bytes: Size of each chunk in bytes

    Returns:
        List of audio chunks
    """
    chunks = []
    for i in range(0, len(audio_data), chunk_size_bytes):
        chunk = audio_data[i : i + chunk_size_bytes]
        chunks.append(chunk)
    return chunks


def calculate_chunk_size(
    sample_rate: int, duration_ms: int, bytes_per_sample: int = 2
) -> int:
    """
    Calculate chunk size in bytes for given parameters.

    Args:
        sample_rate: Audio sample rate in Hz
        duration_ms: Chunk duration in milliseconds
        bytes_per_sample: Bytes per sample (2 for PCM16)

    Returns:
        Chunk size in bytes
    """
    samples_per_chunk = (sample_rate * duration_ms) // 1000
    return samples_per_chunk * bytes_per_sample


def validate_audio_chunk(chunk: bytes, expected_size: int) -> bool:
    """
    Validate audio chunk size and format.

    Args:
        chunk: Audio chunk bytes
        expected_size: Expected chunk size in bytes

    Returns:
        True if valid, False otherwise
    """
    if len(chunk) != expected_size:
        return False
    # PCM16 chunks should be even length
    if len(chunk) % 2 != 0:
        return False
    return True


def resample_audio_metadata(
    original_sample_rate: int, target_sample_rate: int, original_duration_ms: int
) -> int:
    """
    Calculate target duration after resampling.

    Args:
        original_sample_rate: Original sample rate in Hz
        target_sample_rate: Target sample rate in Hz
        original_duration_ms: Original duration in milliseconds

    Returns:
        Target duration in milliseconds
    """
    ratio = target_sample_rate / original_sample_rate
    return int(original_duration_ms * ratio)
