from pydantic import BaseModel, ConfigDict


class TTSRequest(BaseModel):
    text: str
    voice_id: str = "21m00Tcm4TlvDq8ikWAM"  # Default voice
    stability: float = 0.5
    similarity_boost: float = 0.75


class TTSResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    audio_url: str
    text: str
    voice_id: str


class STTResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    transcribed_text: str
    filename: str
