"""
Audio mixing service using MoviePy.

Combines microphone and AI audio streams into a single audio file,
with precise temporal alignment and volume control.
"""

import logging
import tempfile
from pathlib import Path
from typing import List
from services.audio_buffer import AudioChunk
from moviepy.editor import AudioClip, CompositeAudioClip
import numpy as np

logger = logging.getLogger(__name__)


class AudioMixer:
    """
    Mixes multiple audio streams using MoviePy.

    Handles temporal alignment, sample rate conversion, and volume normalization.
    """

    def __init__(self, sample_rate: int = 24000, channels: int = 1):
        """
        Initialize audio mixer.

        Args:
            sample_rate: Target sample rate in Hz
            channels: Number of audio channels
        """
        self.sample_rate = sample_rate
        self.channels = channels

    async def mix_streams(
        self,
        mic_chunks: List[AudioChunk],
        ai_chunks: List[AudioChunk],
        output_path: Path,
        mic_volume: float = 1.0,
        ai_volume: float = 1.0
    ) -> bool:
        """
        Mix microphone and AI audio streams into a single audio file.

        Args:
            mic_chunks: List of microphone audio chunks with timestamps
            ai_chunks: List of AI audio chunks with timestamps
            output_path: Path to output audio file (WAV format)
            mic_volume: Volume multiplier for microphone audio (0.0 to 2.0)
            ai_volume: Volume multiplier for AI audio (0.0 to 2.0)

        Returns:
            True if mixing succeeded, False otherwise
        """
        if not mic_chunks and not ai_chunks:
            logger.warning("No audio chunks to mix")
            return False

        try:
            # Convert chunks to numpy arrays and create AudioClips
            clips = []

            if mic_chunks:
                mic_clip = self._chunks_to_audioclip(mic_chunks, mic_volume)
                clips.append(mic_clip)
                logger.info(f"Created mic audio clip: duration={mic_clip.duration:.2f}s")

            if ai_chunks:
                ai_clip = self._chunks_to_audioclip(ai_chunks, ai_volume)
                clips.append(ai_clip)
                logger.info(f"Created AI audio clip: duration={ai_clip.duration:.2f}s")

            # Composite (mix) all audio clips
            if len(clips) == 1:
                final_audio = clips[0]
            else:
                final_audio = CompositeAudioClip(clips)

            logger.info(f"Mixing audio streams: final duration={final_audio.duration:.2f}s")

            # Write to output file
            final_audio.write_audiofile(
                str(output_path),
                fps=self.sample_rate,
                nbytes=2,  # 16-bit audio
                codec='pcm_s16le',  # WAV format
                ffmpeg_params=["-ac", str(self.channels)],  # Mono/stereo
                logger=None  # Suppress MoviePy logs
            )

            # Close clips to free resources
            final_audio.close()
            for clip in clips:
                clip.close()

            logger.info(f"Audio mixed successfully: {output_path}")
            return True

        except Exception as e:
            logger.error(f"Error mixing audio: {e}", exc_info=True)
            return False

    def _chunks_to_audioclip(self, chunks: List[AudioChunk], volume: float) -> AudioClip:
        """
        Convert audio chunks to a MoviePy AudioClip.

        Args:
            chunks: List of audio chunks with timestamps
            volume: Volume multiplier

        Returns:
            AudioClip with properly aligned audio
        """
        # Sort chunks by timestamp
        sorted_chunks = sorted(chunks, key=lambda c: c.timestamp)

        if not sorted_chunks:
            # Return silent clip
            return AudioClip(lambda t: np.zeros(1), duration=0.0, fps=self.sample_rate)

        # Calculate total duration
        last_chunk = sorted_chunks[-1]
        last_chunk_samples = len(last_chunk.data) // 2  # PCM16 = 2 bytes per sample
        last_chunk_duration = last_chunk_samples / self.sample_rate
        total_duration = last_chunk.timestamp + last_chunk_duration

        # Pre-allocate audio array
        total_samples = int(total_duration * self.sample_rate)
        audio_array = np.zeros(total_samples, dtype=np.float32)

        # Fill audio array with chunks
        for chunk in sorted_chunks:
            # Decode PCM16 to float32
            pcm16_data = np.frombuffer(chunk.data, dtype=np.int16)
            float_data = pcm16_data.astype(np.float32) / 32768.0  # Normalize to [-1, 1]

            # Apply volume
            float_data *= volume

            # Calculate position in array
            start_sample = int(chunk.timestamp * self.sample_rate)
            end_sample = start_sample + len(float_data)

            # Ensure we don't exceed array bounds
            if end_sample > len(audio_array):
                end_sample = len(audio_array)
                float_data = float_data[:end_sample - start_sample]

            # Add to array (mixing if overlapping)
            audio_array[start_sample:end_sample] += float_data

        # Clip to prevent overflow
        audio_array = np.clip(audio_array, -1.0, 1.0)

        # Create AudioClip from array
        def make_frame(t):
            # t is time in seconds, return audio samples for that time
            idx = int(t * self.sample_rate)
            if idx >= len(audio_array):
                return np.array([0.0])
            # Return single value per call (MoviePy handles mono/stereo)
            return np.array([audio_array[idx]])

        return AudioClip(make_frame, duration=total_duration, fps=self.sample_rate)
