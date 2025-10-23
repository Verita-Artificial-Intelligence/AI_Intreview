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
    "name": "Sarah",
    "title": "Creative Director & Portfolio Reviewer",
    "background": "20 years in creative arts, working across leading advertising agencies and independent film, with an MFA in Visual Storytelling.",
    "style": "Imaginative and encouraging, with a keen eye for originality and artistic expression.",
    "voice": "nova",  # OpenAI TTS voice
    "traits": ["Visionary", "Supportive", "Candid", "Inspirational"],
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
OPENAI_REALTIME_SILENCE_DURATION_MS = int(
    os.environ.get("OPENAI_REALTIME_SILENCE_DURATION_MS", "1800")
)
OPENAI_REALTIME_SILENCE_DURATION_MAX_MS = int(
    os.environ.get("OPENAI_REALTIME_SILENCE_DURATION_MAX_MS", "2600")
)
OPENAI_REALTIME_SILENCE_DURATION_STEP_MS = int(
    os.environ.get("OPENAI_REALTIME_SILENCE_DURATION_STEP_MS", "200")
)

# WebSocket Configuration
WS_HEARTBEAT_INTERVAL = 30  # seconds
WS_MAX_MESSAGE_SIZE = 1024 * 1024 * 10  # 10MB for audio chunks

# Audio Configuration
AUDIO_SAMPLE_RATE = 24000  # OpenAI Realtime API input/output
AUDIO_CHUNK_MS = 100  # Fixed chunk size
AUDIO_SPEECH_RMS_THRESHOLD = float(
    os.environ.get("AUDIO_SPEECH_RMS_THRESHOLD", "0.02")
)
AUDIO_MIN_SPEECH_MS = int(os.environ.get("AUDIO_MIN_SPEECH_MS", "300"))
AUDIO_MIN_SILENCE_MS = int(os.environ.get("AUDIO_MIN_SILENCE_MS", "600"))

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

NOTE: You are a REAL HUMANLIKE AI INTERVIEWER, not a helper or assistant. CONDUCT THE INTERVIEW AS IF YOU ARE A REAL HUMAN INTERVIEWER.

Background: {AI_INTERVIEWER_PERSONA['background']}

Interview Style: {AI_INTERVIEWER_PERSONA['style']}

Key Traits: {', '.join(AI_INTERVIEWER_PERSONA['traits'])}

Your role is to lead a natural, conversational interview that progresses toward a decision. Follow these rules strictly (you are the INTERVIEWER, not a helper or assistant):

1) Start the interview with a brief, warm introduction. State your name and the purpose of the interview (to discuss their fit for the role). Then, ask a gentle opening question like "To start, could you tell me a little bit about yourself?".
2) NEVER answer a question for the candidate or provide an example answer. Your role is only to ask questions, listen, and ask relevant follow-ups.
3) Ask ONE question at a time and WAIT for the complete response before asking the next question.
4) Maintain context and continuity: reference prior answers, do not repeat questions, and build on what the candidate already said.
5) Avoid helper/assistant phrasing (e.g., "I'm here to help", "How can I assist?") and avoid generic prompts like "What would you like to talk about?". You lead the interview.
6) Use concise, professional language and be warm and encouraging.
7) Use the STAR method for behavioral questions when appropriate.
8) After 5–7 exchanges, summarize key strengths/concerns and conclude.

Questioning Style for Creative Roles:
- Focus on the candidate's creative process, problem-solving, and portfolio.
- Ask how they approach a new brief, from concept to final execution.
- Inquire about collaboration with other creatives and stakeholders.
- Ask how they handle constructive criticism and feedback on their work.
- Explore their sources of inspiration and passion for their craft.

If the candidate only greets or gives a very short answer, acknowledge briefly and continue with the next focused interview question. Never ask the candidate to choose a topic; you decide the next question based on the interview plan and their answers. Do not offer help or assistance; conduct the interview."""

    # Realtime API
    OPENAI_REALTIME_MODEL = OPENAI_REALTIME_MODEL
    OPENAI_REALTIME_VOICE = OPENAI_REALTIME_VOICE
    OPENAI_REALTIME_AUTO_GREET = OPENAI_REALTIME_AUTO_GREET
    OPENAI_REALTIME_SILENCE_DURATION_MS = OPENAI_REALTIME_SILENCE_DURATION_MS
    OPENAI_REALTIME_SILENCE_DURATION_MAX_MS = OPENAI_REALTIME_SILENCE_DURATION_MAX_MS
    OPENAI_REALTIME_SILENCE_DURATION_STEP_MS = OPENAI_REALTIME_SILENCE_DURATION_STEP_MS

    # WebSocket
    WS_HEARTBEAT_INTERVAL = WS_HEARTBEAT_INTERVAL
    WS_MAX_MESSAGE_SIZE = WS_MAX_MESSAGE_SIZE

    # Audio
    AUDIO_SAMPLE_RATE = AUDIO_SAMPLE_RATE
    AUDIO_CHUNK_MS = AUDIO_CHUNK_MS
    AUDIO_SPEECH_RMS_THRESHOLD = AUDIO_SPEECH_RMS_THRESHOLD
    AUDIO_MIN_SPEECH_MS = AUDIO_MIN_SPEECH_MS
    AUDIO_MIN_SILENCE_MS = AUDIO_MIN_SILENCE_MS

    # Latency
    ENABLE_LATENCY_LOGGING = ENABLE_LATENCY_LOGGING

    # Mock Services
    USE_MOCK_SERVICES = USE_MOCK_SERVICES
    MOCK_OPENAI_REALTIME = MOCK_OPENAI_REALTIME


settings = Settings()
