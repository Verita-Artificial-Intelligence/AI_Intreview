from fastapi import HTTPException, UploadFile
import logging
import base64
import os
from openai import AsyncOpenAI
from models import TTSRequest
from config import OPENAI_API_KEY, AI_INTERVIEWER_PERSONA

openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)


class AudioService:
    @staticmethod
    async def generate_tts(request: TTSRequest):
        """Generate text-to-speech audio using OpenAI TTS"""
        try:
            # Generate audio using OpenAI TTS
            response = await openai_client.audio.speech.create(
                model="tts-1",
                voice=AI_INTERVIEWER_PERSONA["voice"],  # nova voice
                input=request.text,
                response_format="mp3",
            )

            # Get audio data - use .read() to get bytes from the response
            audio_data = response.read()

            # Convert to base64 for transfer
            audio_b64 = base64.b64encode(audio_data).decode()

            # Create response
            return {
                "audio_url": f"data:audio/mpeg;base64,{audio_b64}",
                "text": request.text,
                "voice_id": AI_INTERVIEWER_PERSONA["voice"],
            }

        except Exception as e:
            logging.error(f"Error generating TTS: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"Error generating TTS: {str(e)}"
            )

    @staticmethod
    async def transcribe_audio(audio_file: UploadFile):
        """Transcribe audio file to text using OpenAI Whisper"""
        try:
            # Read uploaded audio file
            audio_content = await audio_file.read()

            # Save temporarily
            temp_file = f"/tmp/{audio_file.filename}"
            with open(temp_file, "wb") as f:
                f.write(audio_content)

            # Transcribe using OpenAI Whisper
            with open(temp_file, "rb") as audio:
                transcription = await openai_client.audio.transcriptions.create(
                    model="whisper-1", file=audio, response_format="text"
                )

            # Clean up temp file
            os.remove(temp_file)

            # Create response
            return {
                "transcribed_text": transcription,
                "filename": audio_file.filename or "unknown.audio",
            }

        except Exception as e:
            logging.error(f"Error transcribing audio: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"Error transcribing audio: {str(e)}"
            )

    @staticmethod
    async def get_voices():
        """Get available OpenAI TTS voices"""
        return {
            "voices": [
                {"voice_id": "nova", "name": "nova", "category": "neutral"},
                {"voice_id": "echo", "name": "Echo", "category": "male"},
                {"voice_id": "fable", "name": "Fable", "category": "neutral"},
                {"voice_id": "onyx", "name": "Onyx", "category": "male"},
                {"voice_id": "nova", "name": "Nova (Dr. Chen)", "category": "female"},
                {"voice_id": "nova", "name": "nova", "category": "female"},
            ]
        }

    @staticmethod
    def get_interviewer_persona():
        """Get AI interviewer persona details"""
        return AI_INTERVIEWER_PERSONA
