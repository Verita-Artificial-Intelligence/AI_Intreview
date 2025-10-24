"""
Audio mixing service using MoviePy.

Combines microphone and AI audio streams into a single audio file,
with precise temporal alignment and volume control.
"""

import asyncio
import logging
import tempfile
from pathlib import Path
from typing import List
from services.audio_buffer import AudioChunk
from moviepy import AudioClip, CompositeAudioClip
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

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None,
            self._mix_streams_sync,
            mic_chunks,
            ai_chunks,
            output_path,
            mic_volume,
            ai_volume,
        )

    def _mix_streams_sync(
        self,
        mic_chunks: List[AudioChunk],
        ai_chunks: List[AudioChunk],
        output_path: Path,
        mic_volume: float,
        ai_volume: float,
    ) -> bool:
        try:
            clips = []

            if mic_chunks:
                mic_clip = self._chunks_to_audioclip(mic_chunks, mic_volume)
                clips.append(mic_clip)
                logger.info(f"Created mic audio clip: duration={mic_clip.duration:.2f}s")

            if ai_chunks:
                ai_clip = self._chunks_to_audioclip(ai_chunks, ai_volume)
                clips.append(ai_clip)
                logger.info(f"Created AI audio clip: duration={ai_clip.duration:.2f}s")

            final_audio = clips[0] if len(clips) == 1 else CompositeAudioClip(clips)
            logger.info(f"Mixing audio streams: final duration={final_audio.duration:.2f}s")

            final_audio.write_audiofile(
                str(output_path),
                fps=self.sample_rate,
                nbytes=2,
                codec='pcm_s16le',
                ffmpeg_params=["-ac", str(self.channels)],
                logger=None,
            )

            final_audio.close()
            for clip in clips:
                clip.close()

            logger.info(f"Audio mixed successfully: {output_path}")
            return True

        except Exception as exc:
            logger.error(f"Error mixing audio: {exc}", exc_info=True)
            return False

    def _chunks_to_audioclip(self, chunks: List[AudioChunk], volume: float) -> AudioClip:
        if not chunks:
            return AudioClip(lambda t: np.zeros((len(np.atleast_1d(t)), 1)), duration=0.0, fps=self.sample_rate)

        # Sort chunks by timestamp to ensure chronological order
        sorted_chunks = sorted(chunks, key=lambda c: c.timestamp)

        # Determine total duration of the final clip
        last_chunk = sorted_chunks[-1]
        last_chunk_duration_seconds = (len(last_chunk.data) / (2 * self.channels)) / self.sample_rate
        total_duration = last_chunk.timestamp + last_chunk_duration_seconds

        # Create a silent numpy array representing the full audio timeline
        total_samples = int(total_duration * self.sample_rate)
        audio_array = np.zeros(total_samples * self.channels, dtype=np.float32)

        # Place each chunk's audio data onto the timeline
        for chunk in sorted_chunks:
            start_sample = int(chunk.timestamp * self.sample_rate)
            
            # Convert PCM16 byte data to a numpy array of floats
            pcm_data = np.frombuffer(chunk.data, dtype=np.int16).astype(np.float32) / 32768.0
            
            end_sample = start_sample + len(pcm_data)

            # Mix audio by adding the new chunk to the corresponding slice of the timeline
            if end_sample <= len(audio_array):
                audio_array[start_sample:end_sample] += pcm_data * volume

        # Ensure the audio array is reshaped for stereo or mono
        audio_array = audio_array.reshape(-1, self.channels)

        # Clip to prevent distortion from clipping
        audio_array = np.clip(audio_array, -1.0, 1.0)

        def make_frame(t):
            """
            Creates a moviepy audio frame for a given time t.
            t can be a scalar or a numpy array.
            """
            if isinstance(t, np.ndarray):
                # Vectorized processing for an array of times
                indices = (t * self.sample_rate).astype(int)
                # Ensure indices are within bounds
                indices = np.clip(indices, 0, audio_array.shape[0] - 1)
                return audio_array[indices]
            else:
                # Scalar processing for a single time
                idx = int(t * self.sample_rate)
                if idx < audio_array.shape[0]:
                    return audio_array[idx]
                else:
                    return np.zeros(self.channels)

        return AudioClip(make_frame, duration=total_duration, fps=self.sample_rate)
