from fastapi import APIRouter, File, UploadFile
from models import TTSRequest
from services import AudioService

router = APIRouter(prefix="/audio", tags=["Audio"])


@router.get("/persona")
async def get_interviewer_persona():
    """Get AI interviewer persona details"""
    return AudioService.get_interviewer_persona()


@router.post("/tts")
async def generate_tts(request: TTSRequest):
    """Generate text-to-speech audio using OpenAI TTS"""
    return await AudioService.generate_tts(request)


@router.post("/stt")
async def transcribe_audio(audio_file: UploadFile = File(...)):
    """Transcribe audio file to text using OpenAI Whisper"""
    return await AudioService.transcribe_audio(audio_file)


@router.get("/voices")
async def get_voices():
    """Get available OpenAI TTS voices"""
    return await AudioService.get_voices()
