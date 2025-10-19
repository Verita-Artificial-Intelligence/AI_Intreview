import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB Configuration
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

# Security Configuration
JWT_SECRET = os.environ.get("JWT_SECRET", "default_secret_key")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY") or os.environ.get("EMERGENT_LLM_KEY")

# CORS Configuration
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")

# AI Interviewer Persona
AI_INTERVIEWER_PERSONA = {
    "name": "Dr. Sarah Chen",
    "title": "Senior Technical Recruiter",
    "background": "15+ years in tech recruiting with a PhD in Organizational Psychology",
    "style": "Professional yet warm, focuses on behavioral and technical competencies",
    "voice": "nova",  # OpenAI TTS voice
    "traits": ["Empathetic", "Detail-oriented", "Encouraging", "Insightful"],
}

# Evaluation Frameworks
EVALUATION_FRAMEWORKS = {
    "behavioral": "Behavioral Interview Assessment (STAR Method)",
    "technical": "Technical Competency Evaluation",
    "cultural_fit": "Cultural Fit & Values Alignment",
    "leadership": "Leadership & Management Assessment",
    "problem_solving": "Problem-Solving & Critical Thinking",
}

# Realtime API Configuration
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY")
OPENAI_REALTIME_MODEL = os.environ.get(
    "OPENAI_REALTIME_MODEL", "gpt-realtime"
)
OPENAI_REALTIME_VOICE = os.environ.get("OPENAI_REALTIME_VOICE", "alloy")

# WebSocket Configuration
WS_HEARTBEAT_INTERVAL = 30  # seconds
WS_MAX_MESSAGE_SIZE = 1024 * 1024 * 10  # 10MB for audio chunks

# Audio Configuration
AUDIO_SAMPLE_RATE = 24000  # OpenAI Realtime API output
AUDIO_CHUNK_MS = 100  # Fixed chunk size
ELEVENLABS_MODEL = "eleven_flash_v2_5"  # Low latency model with viseme support
ELEVENLABS_VOICE_ID = os.environ.get(
    "ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM"
)  # Rachel

# Avatar Configuration
AVATAR_GLB_URL = os.environ.get(
    "AVATAR_GLB_URL",
    "https://models.readyplayer.me/64f1b2c3d4e5f6a7b8c9d0e1.glb",
)

# Latency Tracking
ENABLE_LATENCY_LOGGING = (
    os.environ.get("ENABLE_LATENCY_LOGGING", "true").lower() == "true"
)


# Settings class for easy access
class Settings:
    """Application settings."""

    # MongoDB
    MONGO_URL = MONGO_URL
    DB_NAME = DB_NAME

    # Security
    JWT_SECRET = JWT_SECRET
    OPENAI_API_KEY = OPENAI_API_KEY

    # CORS
    CORS_ORIGINS = CORS_ORIGINS

    # AI Persona (convert dict to instruction string)
    AI_INTERVIEWER_PERSONA = f"""You are {AI_INTERVIEWER_PERSONA['name']}, {AI_INTERVIEWER_PERSONA['title']}.

Background: {AI_INTERVIEWER_PERSONA['background']}

Interview Style: {AI_INTERVIEWER_PERSONA['style']}

Key Traits: {', '.join(AI_INTERVIEWER_PERSONA['traits'])}

Your role is to conduct professional interviews, asking thoughtful questions that assess candidates' skills, experience, and cultural fit. Be warm and encouraging while maintaining professionalism. Use the STAR method for behavioral questions."""

    # Realtime API
    OPENAI_REALTIME_MODEL = OPENAI_REALTIME_MODEL
    OPENAI_REALTIME_VOICE = OPENAI_REALTIME_VOICE
    ELEVENLABS_API_KEY = ELEVENLABS_API_KEY
    ELEVENLABS_MODEL = ELEVENLABS_MODEL
    ELEVENLABS_VOICE_ID = ELEVENLABS_VOICE_ID

    # WebSocket
    WS_HEARTBEAT_INTERVAL = WS_HEARTBEAT_INTERVAL
    WS_MAX_MESSAGE_SIZE = WS_MAX_MESSAGE_SIZE

    # Audio
    AUDIO_SAMPLE_RATE = AUDIO_SAMPLE_RATE
    AUDIO_CHUNK_MS = AUDIO_CHUNK_MS

    # Avatar
    AVATAR_GLB_URL = AVATAR_GLB_URL

    # Latency
    ENABLE_LATENCY_LOGGING = ENABLE_LATENCY_LOGGING


settings = Settings()
