"""WebSocket message models for realtime interview communication."""

from pydantic import BaseModel, Field
from typing import Literal, Optional, Dict, Any, List
from datetime import datetime


# ===== Client -> Server Messages =====


class StartSessionMessage(BaseModel):
    """Initialize interview session."""

    event: Literal["start"]
    session_id: str
    interview_id: Optional[str] = None
    candidate_id: Optional[str] = None


class MicChunkMessage(BaseModel):
    """Audio chunk from client microphone."""

    event: Literal["mic_chunk"]
    seq: int
    audio_b64: str
    timestamp: Optional[float] = None


class UserTurnEndMessage(BaseModel):
    """Signal user has finished speaking."""

    event: Literal["user_turn_end"]
    timestamp: Optional[float] = None


class BargeInMessage(BaseModel):
    """User interrupts AI response."""

    event: Literal["barge_in"]
    timestamp: Optional[float] = None


class EndSessionMessage(BaseModel):
    """End interview session."""

    event: Literal["end"]
    reason: Optional[str] = None


# ===== Server -> Client Messages =====


class TranscriptMessage(BaseModel):
    """Transcription result from speech recognition."""

    event: Literal["transcript"]
    text: str
    final: bool
    speaker: Literal["user", "ai"]
    timestamp: Optional[float] = None


class AlignmentUnit(BaseModel):
    """Viseme alignment data for lip sync."""

    t: float  # Start time in seconds
    d: float  # Duration in seconds
    unit: Literal["char", "word", "phoneme"]
    val: str  # Character, word, or phoneme value


class TTSChunkMessage(BaseModel):
    """TTS audio chunk with alignment data."""

    event: Literal["tts_chunk"]
    seq: int
    audio_b64: str
    align: Optional[List[AlignmentUnit]] = None
    is_final: bool = False


class AnswerEndMessage(BaseModel):
    """Signal AI response is complete."""

    event: Literal["answer_end"]
    timestamp: Optional[float] = None


class NoticeMessage(BaseModel):
    """Informational message to client."""

    event: Literal["notice"]
    msg: str
    level: Literal["info", "warning"] = "info"


class ErrorMessage(BaseModel):
    """Error message to client."""

    event: Literal["error"]
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None


class MetricsMessage(BaseModel):
    """Latency and performance metrics."""

    event: Literal["metrics"]
    latency: Dict[str, Optional[float]]
    timestamp: Optional[float] = None


class SessionReadyMessage(BaseModel):
    """Session initialized and ready."""

    event: Literal["session_ready"]
    session_id: str
    avatar_url: Optional[str] = None


# ===== WebSocket Session State =====


class SessionState(BaseModel):
    """Maintain state for a WebSocket session."""

    session_id: str
    interview_id: Optional[str] = None
    candidate_id: Optional[str] = None
    connected_at: datetime = Field(default_factory=datetime.utcnow)
    is_speaking: bool = False
    last_heartbeat: Optional[datetime] = None
