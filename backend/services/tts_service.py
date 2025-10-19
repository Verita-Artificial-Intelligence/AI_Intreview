"""
ElevenLabs TTS service with streaming and viseme alignment.

This service manages WebSocket connection to ElevenLabs for:
- Streaming text-to-speech generation
- Viseme alignment data for lip sync
- Low-latency audio delivery
"""

import asyncio
import json
import logging
from typing import AsyncIterator, Optional, Dict, Any, List
import websockets
from websockets.client import WebSocketClientProtocol
import base64

logger = logging.getLogger(__name__)


class TTSService:
    """
    Manages connection to ElevenLabs streaming TTS API.

    Handles:
    - WebSocket connection lifecycle
    - Text streaming for TTS generation
    - Audio chunk reception with alignment metadata
    - Viseme data for lip sync
    """

    def __init__(
        self,
        api_key: str,
        voice_id: str,
        model_id: str = "eleven_flash_v2_5",
        output_format: str = "mp3_44100_128",
    ):
        """
        Initialize ElevenLabs TTS service.

        Args:
            api_key: ElevenLabs API key
            voice_id: Voice ID to use
            model_id: Model ID (eleven_flash_v2_5 for low latency)
            output_format: Audio format
        """
        self.api_key = api_key
        self.voice_id = voice_id
        self.model_id = model_id
        self.output_format = output_format
        self.ws: Optional[WebSocketClientProtocol] = None
        self.connected = False
        self._receive_task: Optional[asyncio.Task] = None
        self._audio_queue: asyncio.Queue = asyncio.Queue()
        self._chunk_seq = 0

    async def connect(self) -> None:
        """Establish WebSocket connection to ElevenLabs."""
        try:
            url = (
                f"wss://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}/"
                f"stream-input?model_id={self.model_id}&output_format={self.output_format}"
            )

            logger.info(f"Connecting to ElevenLabs TTS: {self.voice_id}")
            self.ws = await websockets.connect(
                url,
                ping_interval=20,
                ping_timeout=10,
            )
            self.connected = True
            logger.info("Connected to ElevenLabs TTS")

            # Start receiving messages
            self._receive_task = asyncio.create_task(self._receive_loop())

            # Send initialization message
            await self._initialize()

        except Exception as e:
            logger.error(f"Failed to connect to ElevenLabs: {e}")
            self.connected = False
            raise

    async def _initialize(self) -> None:
        """Send initialization configuration to ElevenLabs."""
        init_message = {
            "text": " ",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
                "style": 0,
                "use_speaker_boost": True,
            },
            "xi_api_key": self.api_key,
            "auto_mode": True,
            "sync_alignment": True,
        }

        await self._send_message(init_message)
        logger.info("ElevenLabs session initialized with alignment enabled")

    async def _send_message(self, message: Dict[str, Any]) -> None:
        """Send message to ElevenLabs WebSocket."""
        if not self.ws or not self.connected:
            raise RuntimeError("WebSocket not connected")

        await self.ws.send(json.dumps(message))

    async def _receive_loop(self) -> None:
        """Continuously receive messages from ElevenLabs."""
        try:
            if not self.ws:
                return

            async for message in self.ws:
                try:
                    data = json.loads(message)
                    await self._audio_queue.put(data)

                    # Log important events
                    if "error" in data:
                        logger.error(f"ElevenLabs error: {data['error']}")
                    elif data.get("isFinal"):
                        logger.debug("ElevenLabs: Final chunk received")

                except json.JSONDecodeError as e:
                    logger.error(f"Failed to decode ElevenLabs message: {e}")
                except Exception as e:
                    logger.error(f"Error processing ElevenLabs message: {e}")

        except websockets.exceptions.ConnectionClosed:
            logger.info("ElevenLabs WebSocket connection closed")
            self.connected = False
        except Exception as e:
            logger.error(f"Error in ElevenLabs receive loop: {e}")
            self.connected = False

    async def send_text(self, text: str, flush: bool = False) -> None:
        """
        Send text to ElevenLabs for TTS generation.

        Args:
            text: Text to convert to speech
            flush: If True, signals end of text input (triggers generation)
        """
        if flush:
            # Send final flush message
            message = {"text": ""}
            await self._send_message(message)
            logger.debug("Sent flush signal to ElevenLabs")
        else:
            message = {"text": text}
            await self._send_message(message)
            logger.debug(f"Sent text to ElevenLabs: {text[:50]}...")

    async def aiter_audio(
        self,
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Async iterator over audio chunks from ElevenLabs.

        Yields:
            Dictionaries with:
            - audio_b64: Base64-encoded audio chunk (MP3)
            - align: List of alignment units for visemes
            - is_final: Boolean indicating if this is the last chunk
            - seq: Sequence number
        """
        while self.connected or not self._audio_queue.empty():
            try:
                data = await asyncio.wait_for(
                    self._audio_queue.get(), timeout=0.1
                )

                # Process the response
                audio_b64 = data.get("audio")
                alignment = data.get("alignment")
                is_final = data.get("isFinal", False)

                if audio_b64:
                    # Convert alignment to our format
                    align_units = []
                    if alignment:
                        align_units = self._parse_alignment(alignment)

                    yield {
                        "audio_b64": audio_b64,
                        "align": align_units,
                        "is_final": is_final,
                        "seq": self._chunk_seq,
                    }
                    self._chunk_seq += 1

                elif is_final:
                    # Final message without audio
                    yield {
                        "audio_b64": "",
                        "align": [],
                        "is_final": True,
                        "seq": self._chunk_seq,
                    }
                    break

            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Error iterating audio chunks: {e}")
                break

    def _parse_alignment(
        self, alignment: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Parse ElevenLabs alignment data into viseme units.

        Args:
            alignment: Raw alignment data from ElevenLabs

        Returns:
            List of alignment units with format:
            {t: float, d: float, unit: str, val: str}
        """
        align_units = []

        # ElevenLabs provides character-level alignment
        chars = alignment.get("characters", [])
        char_start_times = alignment.get("character_start_times_seconds", [])
        char_durations = alignment.get("character_end_times_seconds", [])

        for i, char in enumerate(chars):
            if i >= len(char_start_times) or i >= len(char_durations):
                break

            start_time = char_start_times[i]
            end_time = char_durations[i]
            duration = end_time - start_time

            align_units.append({
                "t": start_time,
                "d": duration,
                "unit": "char",
                "val": char,
            })

        return align_units

    async def clear_queue(self) -> None:
        """Clear pending audio chunks (for interruptions)."""
        while not self._audio_queue.empty():
            try:
                self._audio_queue.get_nowait()
            except asyncio.QueueEmpty:
                break

        logger.debug("Cleared ElevenLabs audio queue")

    async def close(self) -> None:
        """Close WebSocket connection and cleanup."""
        self.connected = False

        # Send final flush
        try:
            if self.ws and not self.ws.closed:
                await self.send_text("", flush=True)
        except Exception as e:
            logger.error(f"Error sending final flush: {e}")

        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass

        if self.ws:
            await self.ws.close()
            logger.info("ElevenLabs TTS connection closed")

    def reset_sequence(self) -> None:
        """Reset chunk sequence counter (for new responses)."""
        self._chunk_seq = 0
