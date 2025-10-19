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
OPENAI_REALTIME_MODEL = os.environ.get(
    "OPENAI_REALTIME_MODEL", "gpt-realtime"
)
OPENAI_REALTIME_VOICE = os.environ.get("OPENAI_REALTIME_VOICE", "alloy")
OPENAI_REALTIME_AUTO_GREET = (
    os.environ.get("OPENAI_REALTIME_AUTO_GREET", "true").lower() == "true"
)

# WebSocket Configuration
WS_HEARTBEAT_INTERVAL = 30  # seconds
WS_MAX_MESSAGE_SIZE = 1024 * 1024 * 10  # 10MB for audio chunks

# Audio Configuration
AUDIO_SAMPLE_RATE = 24000  # OpenAI Realtime API input/output
AUDIO_CHUNK_MS = 100  # Fixed chunk size

# Latency Tracking
ENABLE_LATENCY_LOGGING = (
    os.environ.get("ENABLE_LATENCY_LOGGING", "true").lower() == "true"
)

# Mock Services Configuration (for development/testing without API costs)
USE_MOCK_SERVICES = os.environ.get("USE_MOCK_SERVICES", "false").lower() == "true"
MOCK_OPENAI_REALTIME = os.environ.get("MOCK_OPENAI_REALTIME", str(USE_MOCK_SERVICES)).lower() == "true"


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

Your role is to lead a natural, conversational interview that progresses toward a decision. Follow these rules strictly (you are the INTERVIEWER, not a helper or assistant):

1) Start the interview promptly: if the candidate greets or engages in small talk (e.g., "hi", "hello"), respond briefly and immediately ask the first interview question relevant to the role.
2) Ask ONE question at a time and WAIT for the complete response before asking the next question.
3) Maintain context and continuity: reference prior answers, do not repeat questions, and build on what the candidate already said.
4) Avoid helper/assistant phrasing (e.g., "I'm here to help", "How can I assist?") and avoid generic prompts like "What would you like to talk about?". You lead the interview.
5) Use concise, professional language and be warm and encouraging.
6) Use the STAR method for behavioral questions when appropriate.
7) After 5–7 exchanges, summarize key strengths/concerns and conclude.

If the candidate only greets or gives a very short answer, acknowledge briefly and continue with the next focused interview question. Never ask the candidate to choose a topic; you decide the next question based on the interview plan and their answers. Do not offer help or assistance; conduct the interview."""

    # Realtime API
    OPENAI_REALTIME_MODEL = OPENAI_REALTIME_MODEL
    OPENAI_REALTIME_VOICE = OPENAI_REALTIME_VOICE
    OPENAI_REALTIME_AUTO_GREET = OPENAI_REALTIME_AUTO_GREET

    # WebSocket
    WS_HEARTBEAT_INTERVAL = WS_HEARTBEAT_INTERVAL
    WS_MAX_MESSAGE_SIZE = WS_MAX_MESSAGE_SIZE

    # Audio
    AUDIO_SAMPLE_RATE = AUDIO_SAMPLE_RATE
    AUDIO_CHUNK_MS = AUDIO_CHUNK_MS

    # Latency
    ENABLE_LATENCY_LOGGING = ENABLE_LATENCY_LOGGING

    # Mock Services
    USE_MOCK_SERVICES = USE_MOCK_SERVICES
    MOCK_OPENAI_REALTIME = MOCK_OPENAI_REALTIME


settings = Settings()
