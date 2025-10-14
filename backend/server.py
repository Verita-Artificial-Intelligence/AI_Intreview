from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Initialize OpenAI Realtime for audio
realtime_chat = OpenAIChatRealtime(api_key=EMERGENT_LLM_KEY)
realtime_router = APIRouter()
OpenAIChatRealtime.register_openai_realtime_router(realtime_router, realtime_chat)

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