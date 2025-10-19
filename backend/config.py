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
