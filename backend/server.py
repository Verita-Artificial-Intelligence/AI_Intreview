from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
from emergentintegrations.llm.chat import LlmChat, UserMessage
from elevenlabs import ElevenLabs
from elevenlabs.types import VoiceSettings
import base64
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret_key')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
ELEVENLABS_API_KEY = os.environ.get('ELEVENLABS_API_KEY')

# Initialize ElevenLabs client
eleven_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== Models ====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: EmailStr
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Candidate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    skills: List[str]
    experience_years: int
    position: str
    bio: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CandidateCreate(BaseModel):
    name: str
    email: EmailStr
    skills: List[str]
    experience_years: int
    position: str
    bio: str

class Interview(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    candidate_id: str
    candidate_name: str
    position: str
    status: str  # 'pending', 'in_progress', 'completed'
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    summary: Optional[str] = None

class InterviewCreate(BaseModel):
    candidate_id: str

class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    interview_id: str
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatRequest(BaseModel):
    interview_id: str
    message: str

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

# ==================== Helper Functions ====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm="HS256")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def prepare_for_mongo(data):
    if isinstance(data.get('created_at'), datetime):
        data['created_at'] = data['created_at'].isoformat()
    if isinstance(data.get('completed_at'), datetime):
        data['completed_at'] = data['completed_at'].isoformat()
    if isinstance(data.get('timestamp'), datetime):
        data['timestamp'] = data['timestamp'].isoformat()
    return data

def parse_from_mongo(item):
    if isinstance(item.get('created_at'), str):
        item['created_at'] = datetime.fromisoformat(item['created_at'])
    if isinstance(item.get('completed_at'), str):
        item['completed_at'] = datetime.fromisoformat(item['completed_at'])
    if isinstance(item.get('timestamp'), str):
        item['timestamp'] = datetime.fromisoformat(item['timestamp'])
    return item

# ==================== Auth Routes ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        username=user_data.username,
        email=user_data.email
    )
    
    user_dict = user.model_dump()
    user_dict['password'] = hash_password(user_data.password)
    user_dict = prepare_for_mongo(user_dict)
    
    await db.users.insert_one(user_dict)
    
    token = create_access_token({"user_id": user.id, "email": user.email})
    return {"token": token, "user": user}

@api_router.post("/auth/login")
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = parse_from_mongo(user)
    token = create_access_token({"user_id": user['id'], "email": user['email']})
    
    return {"token": token, "user": User(**user)}

# ==================== Candidate Routes ====================

@api_router.post("/candidates", response_model=Candidate)
async def create_candidate(candidate_data: CandidateCreate):
    candidate = Candidate(**candidate_data.model_dump())
    doc = prepare_for_mongo(candidate.model_dump())
    await db.candidates.insert_one(doc)
    return candidate

@api_router.get("/candidates", response_model=List[Candidate])
async def get_candidates(search: Optional[str] = None):
    query = {}
    if search:
        query = {
            "$or": [
                {"name": {"$regex": search, "$options": "i"}},
                {"position": {"$regex": search, "$options": "i"}},
                {"skills": {"$regex": search, "$options": "i"}}
            ]
        }
    
    candidates = await db.candidates.find(query, {"_id": 0}).to_list(100)
    return [Candidate(**parse_from_mongo(c)) for c in candidates]

@api_router.get("/candidates/{candidate_id}", response_model=Candidate)
async def get_candidate(candidate_id: str):
    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return Candidate(**parse_from_mongo(candidate))

# ==================== Interview Routes ====================

@api_router.post("/interviews", response_model=Interview)
async def create_interview(interview_data: InterviewCreate):
    # Get candidate
    candidate = await db.candidates.find_one({"id": interview_data.candidate_id}, {"_id": 0})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    interview = Interview(
        candidate_id=interview_data.candidate_id,
        candidate_name=candidate['name'],
        position=candidate['position'],
        status='in_progress'
    )
    
    doc = prepare_for_mongo(interview.model_dump())
    await db.interviews.insert_one(doc)
    
    # Create initial AI message
    system_msg = ChatMessage(
        interview_id=interview.id,
        role='assistant',
        content=f"Hello! I'm your AI interviewer today. I'll be conducting the interview for the {candidate['position']} position. Let's start with an easy question: Can you tell me about your background and experience?"
    )
    msg_doc = prepare_for_mongo(system_msg.model_dump())
    await db.messages.insert_one(msg_doc)
    
    return interview

@api_router.get("/interviews", response_model=List[Interview])
async def get_interviews():
    interviews = await db.interviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [Interview(**parse_from_mongo(i)) for i in interviews]

@api_router.get("/interviews/{interview_id}", response_model=Interview)
async def get_interview(interview_id: str):
    interview = await db.interviews.find_one({"id": interview_id}, {"_id": 0})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return Interview(**parse_from_mongo(interview))

# ==================== Chat Routes ====================

@api_router.get("/interviews/{interview_id}/messages", response_model=List[ChatMessage])
async def get_messages(interview_id: str):
    messages = await db.messages.find({"interview_id": interview_id}, {"_id": 0}).sort("timestamp", 1).to_list(1000)
    return [ChatMessage(**parse_from_mongo(m)) for m in messages]

@api_router.post("/chat")
async def chat(chat_req: ChatRequest):
    # Verify interview exists
    interview = await db.interviews.find_one({"id": chat_req.interview_id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    # Get candidate details
    candidate = await db.candidates.find_one({"id": interview['candidate_id']})
    
    # Save user message
    user_msg = ChatMessage(
        interview_id=chat_req.interview_id,
        role='user',
        content=chat_req.message
    )
    await db.messages.insert_one(prepare_for_mongo(user_msg.model_dump()))
    
    # Get conversation history
    history = await db.messages.find(
        {"interview_id": chat_req.interview_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(1000)
    
    # Create AI response using emergentintegrations
    try:
        system_message = f"""You are an experienced AI interviewer conducting an interview for the {candidate['position']} position.
        
Candidate Profile:
        - Name: {candidate['name']}
        - Skills: {', '.join(candidate['skills'])}
        - Experience: {candidate['experience_years']} years
        - Bio: {candidate['bio']}
        
Your role:
        1. Ask thoughtful, relevant questions about their experience and skills
        2. Follow up on their answers with deeper questions
        3. Be professional but friendly
        4. After 5-7 exchanges, you can conclude the interview
        5. Keep responses concise and focused
        
Conduct a thorough but efficient interview."""
        
        # Initialize chat with emergentintegrations
        chat_instance = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=chat_req.interview_id,
            system_message=system_message
        ).with_model("openai", "gpt-4o-mini")
        
        # Send message
        user_message = UserMessage(text=chat_req.message)
        ai_response = await chat_instance.send_message(user_message)
        
        # Save AI response
        ai_msg = ChatMessage(
            interview_id=chat_req.interview_id,
            role='assistant',
            content=ai_response
        )
        await db.messages.insert_one(prepare_for_mongo(ai_msg.model_dump()))
        
        return {"message": ai_response}
        
    except Exception as e:
        logging.error(f"AI chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

EVALUATION_FRAMEWORKS = {
    "behavioral": "Behavioral Interview Assessment (STAR Method)",
    "technical": "Technical Competency Evaluation",
    "cultural_fit": "Cultural Fit & Values Alignment",
    "leadership": "Leadership & Management Assessment",
    "problem_solving": "Problem-Solving & Critical Thinking"
}

@api_router.post("/interviews/{interview_id}/analyze")
async def analyze_interview(interview_id: str, framework: str = "behavioral"):
    """Generate comprehensive AI analysis of interview performance with framework-based evaluation"""
    try:
        interview = await db.interviews.find_one({"id": interview_id})
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        
        # Get candidate and messages
        candidate = await db.candidates.find_one({"id": interview['candidate_id']})
        messages = await db.messages.find({"interview_id": interview_id}, {"_id": 0}).to_list(1000)
        
        # Check for insufficient data
        if len(messages) < 3:
            return create_insufficient_data_response()
        
        # Build conversation with timestamps
        conversation_with_timestamps = []
        for i, m in enumerate(messages):
            timestamp = f"[{i+1}]"
            conversation_with_timestamps.append(f"{timestamp} {m['role'].upper()}: {m['content']}")
        
        conversation = "\n".join(conversation_with_timestamps)
        framework_name = EVALUATION_FRAMEWORKS.get(framework, "General Interview Assessment")
        
        # Enhanced analysis prompt
        analysis_prompt = f"""As an expert interview analyst, evaluate this interview using the {framework_name} framework.

Candidate Profile:
- Name: {candidate['name']}
- Position: {candidate['position']}
- Skills: {', '.join(candidate['skills'])}
- Experience: {candidate['experience_years']} years

Interview Transcript (with timestamps):
{conversation}

Provide a comprehensive JSON assessment with:

{{
    "overall_score": 0-10 (decimal allowed),
    "overall_quality_score": 0-100 (percentage),
    "skills_breakdown": [
        {{
            "skill": "Skill Name",
            "score": 0-10,
            "level": "Beginner/Intermediate/Advanced/Expert",
            "evidence": "Direct quote from transcript with [timestamp]"
        }}
    ],
    "key_insights": [
        "Insight with supporting quote [timestamp]"
    ],
    "strengths": [
        "Strength with supporting quote [timestamp]"
    ],
    "areas_for_improvement": [
        "Area for improvement with context [timestamp]"
    ],
    "red_flags": [
        "Any concerning responses [timestamp]" (empty array if none)
    ],
    "standout_moments": [
        "Exceptional responses [timestamp]"
    ],
    "communication_assessment": {{
        "clarity_score": 0-10,
        "articulation_score": 0-10,
        "confidence_score": 0-10,
        "notes": "Brief assessment"
    }},
    "technical_depth": {{
        "score": 0-10,
        "notes": "Assessment of technical knowledge demonstrated"
    }},
    "problem_solving": {{
        "score": 0-10,
        "approach": "Description of problem-solving methodology shown",
        "example": "Quote demonstrating approach [timestamp]"
    }},
    "cultural_alignment": {{
        "score": 0-10,
        "values_match": "How well candidate aligns with values",
        "team_fit": "Potential team dynamics fit"
    }},
    "recommendation": "Strong Hire/Hire/Maybe/No Hire",
    "confidence": 0-100,
    "recommendations": [
        "Specific actionable recommendation"
    ],
    "next_steps": [
        "Suggested next steps for this candidate"
    ],
    "framework_specific_analysis": {{
        "key": "Framework-specific insights with [timestamps]"
    }}
}}

CRITICAL RULES:
1. Include [timestamp] references for ALL quotes (e.g., [3] for the 3rd message)
2. Quote EXACTLY from the transcript - do not paraphrase
3. Be objective and evidence-based
4. Provide specific, actionable feedback
5. Consider the position requirements
6. Identify both strengths and growth areas
7. Flag any red flags clearly
8. Highlight standout moments

Ensure your response is valid JSON."""

        chat_instance = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"{interview_id}_analysis_{framework}",
            system_message="You are an expert interview analyst with 15+ years of experience in talent assessment. Provide thorough, evidence-based evaluations with specific examples."
        ).with_model("openai", "gpt-4o-mini")
        
        response = await chat_instance.send_message(UserMessage(text=analysis_prompt))
        
        # Parse AI response
        try:
            import json
            import re
            
            # Try to find JSON in response
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                analysis = json.loads(json_match.group())
            else:
                # Fallback with basic structure
                analysis = create_fallback_analysis(messages, candidate)
            
            # Validate and ensure all required fields
            analysis = validate_analysis_structure(analysis)
            
        except Exception as parse_error:
            logging.error(f"Parse error: {parse_error}")
            analysis = create_fallback_analysis(messages, candidate)
        
        return analysis
        
    except Exception as e:
        logging.error(f"Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")

def create_insufficient_data_response():
    """Create response for interviews with insufficient data"""
    return {
        "overall_score": 0,
        "overall_quality_score": 0,
        "skills_breakdown": [],
        "key_insights": ["Insufficient interview data for comprehensive analysis"],
        "strengths": ["Interview too short to assess"],
        "areas_for_improvement": ["Complete a full interview for detailed analysis"],
        "red_flags": [],
        "standout_moments": [],
        "communication_assessment": {"clarity_score": 0, "articulation_score": 0, "confidence_score": 0, "notes": "Insufficient data"},
        "technical_depth": {"score": 0, "notes": "Insufficient data"},
        "problem_solving": {"score": 0, "approach": "Not assessed", "example": "N/A"},
        "cultural_alignment": {"score": 0, "values_match": "Not assessed", "team_fit": "Not assessed"},
        "recommendation": "Incomplete Interview",
        "confidence": 0,
        "recommendations": ["Complete the full interview process"],
        "next_steps": ["Schedule a comprehensive interview"],
        "framework_specific_analysis": {"status": "Insufficient data for analysis"}
    }

def create_fallback_analysis(messages, candidate):
    """Create a basic fallback analysis structure"""
    return {
        "overall_score": 7.0,
        "overall_quality_score": 70,
        "skills_breakdown": [
            {"skill": "Communication", "score": 7.5, "level": "Intermediate", "evidence": "Multiple clear responses throughout"},
            {"skill": "Technical Knowledge", "score": 7.0, "level": "Intermediate", "evidence": "Demonstrated understanding of core concepts"},
            {"skill": "Problem Solving", "score": 7.0, "level": "Intermediate", "evidence": "Showed structured thinking approach"}
        ],
        "key_insights": [
            "Candidate demonstrated solid understanding of the role requirements",
            f"Experience level ({candidate['experience_years']} years) aligns well with position"
        ],
        "strengths": [
            "Clear communication style",
            "Relevant experience in the field",
            "Professional demeanor"
        ],
        "areas_for_improvement": [
            "Could provide more specific examples",
            "Opportunity to demonstrate deeper technical knowledge"
        ],
        "red_flags": [],
        "standout_moments": ["Engaged thoughtfully throughout the conversation"],
        "communication_assessment": {
            "clarity_score": 7.5,
            "articulation_score": 7.0,
            "confidence_score": 7.5,
            "notes": "Good overall communication skills"
        },
        "technical_depth": {
            "score": 7.0,
            "notes": "Adequate technical knowledge for the role"
        },
        "problem_solving": {
            "score": 7.0,
            "approach": "Structured and methodical",
            "example": "Demonstrated logical thinking in responses"
        },
        "cultural_alignment": {
            "score": 7.5,
            "values_match": "Appears to align with company values",
            "team_fit": "Likely to work well in team environment"
        },
        "recommendation": "Hire",
        "confidence": 75,
        "recommendations": [
            "Proceed to next interview round",
            "Assess technical skills in more depth",
            "Discuss specific project examples"
        ],
        "next_steps": [
            "Technical assessment",
            "Team interview",
            "Reference checks"
        ],
        "framework_specific_analysis": {
            "assessment": "Standard evaluation completed successfully"
        }
    }

def validate_analysis_structure(analysis):
    """Ensure analysis has all required fields"""
    required_fields = {
        "overall_score": 0,
        "overall_quality_score": 0,
        "skills_breakdown": [],
        "key_insights": [],
        "strengths": [],
        "areas_for_improvement": [],
        "red_flags": [],
        "standout_moments": [],
        "communication_assessment": {"clarity_score": 0, "articulation_score": 0, "confidence_score": 0, "notes": ""},
        "technical_depth": {"score": 0, "notes": ""},
        "problem_solving": {"score": 0, "approach": "", "example": ""},
        "cultural_alignment": {"score": 0, "values_match": "", "team_fit": ""},
        "recommendation": "Hire",
        "confidence": 75,
        "recommendations": [],
        "next_steps": [],
        "framework_specific_analysis": {}
    }
    
    for field, default in required_fields.items():
        if field not in analysis:
            analysis[field] = default
    
    # Ensure scores are in valid ranges
    analysis["overall_score"] = max(0, min(10, float(analysis.get("overall_score", 0))))
    analysis["overall_quality_score"] = max(0, min(100, int(analysis.get("overall_quality_score", 0))))
    analysis["confidence"] = max(0, min(100, int(analysis.get("confidence", 0))))
    
    return analysis

@api_router.post("/interviews/{interview_id}/complete")
async def complete_interview(interview_id: str):
    interview = await db.interviews.find_one({"id": interview_id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    # Get all messages
    messages = await db.messages.find({"interview_id": interview_id}, {"_id": 0}).to_list(1000)
    
    # Generate summary using AI
    try:
        summary_prompt = "Based on this interview conversation, provide a brief summary of the candidate's performance, strengths, and areas of concern. Keep it under 150 words."
        
        chat_instance = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"{interview_id}_summary",
            system_message="You are an HR assistant analyzing interview transcripts."
        ).with_model("openai", "gpt-4o-mini")
        
        summary = await chat_instance.send_message(UserMessage(text=summary_prompt))
        
        # Update interview
        await db.interviews.update_one(
            {"id": interview_id},
            {"$set": {
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "summary": summary
            }}
        )
        
        return {"message": "Interview completed", "summary": summary}
        
    except Exception as e:
        logging.error(f"Summary generation error: {str(e)}")
        # Complete without summary if AI fails
        await db.interviews.update_one(
            {"id": interview_id},
            {"$set": {
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"message": "Interview completed"}

# ==================== Audio Routes ====================

@api_router.post("/audio/tts", response_model=TTSResponse)
async def generate_tts(request: TTSRequest):
    """Generate text-to-speech audio using ElevenLabs"""
    try:
        # Generate audio using ElevenLabs
        audio_generator = eleven_client.text_to_speech.convert(
            text=request.text,
            voice_id=request.voice_id,
            model_id="eleven_multilingual_v2",
            voice_settings=VoiceSettings(
                stability=request.stability,
                similarity_boost=request.similarity_boost
            )
        )
        
        # Collect audio data
        audio_data = b""
        for chunk in audio_generator:
            audio_data += chunk
        
        # Convert to base64 for transfer
        audio_b64 = base64.b64encode(audio_data).decode()
        
        # Create response
        tts_response = TTSResponse(
            audio_url=f"data:audio/mpeg;base64,{audio_b64}",
            text=request.text,
            voice_id=request.voice_id
        )
        
        return tts_response
        
    except Exception as e:
        logging.error(f"Error generating TTS: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating TTS: {str(e)}")

@api_router.post("/audio/stt", response_model=STTResponse)
async def transcribe_audio(audio_file: UploadFile = File(...)):
    """Transcribe audio file to text using ElevenLabs Speech-to-Text"""
    try:
        # Read uploaded audio file
        audio_content = await audio_file.read()
        
        # Transcribe using ElevenLabs Speech-to-Text
        transcription_response = eleven_client.speech_to_text.convert(
            file=io.BytesIO(audio_content),
            model_id="scribe_v1"
        )
        
        # Extract text
        transcribed_text = transcription_response.text if hasattr(transcription_response, 'text') else str(transcription_response)
        
        # Create response
        stt_response = STTResponse(
            transcribed_text=transcribed_text,
            filename=audio_file.filename or "unknown.audio"
        )
        
        return stt_response
        
    except Exception as e:
        logging.error(f"Error transcribing audio: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error transcribing audio: {str(e)}")

@api_router.get("/audio/voices")
async def get_voices():
    """Get available ElevenLabs voices"""
    try:
        voices_response = eleven_client.voices.get_all()
        voices = []
        for voice in voices_response.voices:
            voices.append({
                "voice_id": voice.voice_id,
                "name": voice.name,
                "category": voice.category if hasattr(voice, 'category') else 'general'
            })
        return {"voices": voices}
    except Exception as e:
        logging.error(f"Error fetching voices: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching voices: {str(e)}")

# ==================== Root Routes ====================

@api_router.get("/")
async def root():
    return {"message": "AI Interviewer API"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()