from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
import logging
from config import CORS_ORIGINS
from database import shutdown_db_client
from routers import (
    auth,
    profile,
    interviews,
    candidates,
    analysis,
    audio,
    chat,
    websocket,
    uploads,
)

# Main application setup
app = FastAPI(
    title="AI Interview Platform API",
    description="API for managing AI-powered interviews, candidates, and analysis.",
    version="1.0.0",
)

# Event handlers for database connection
@app.on_event("shutdown")
async def shutdown_db():
    await shutdown_db_client()


# Include all routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(profile.router, prefix="/api/profile", tags=["User Profile"])
app.include_router(interviews.router, prefix="/api/interviews", tags=["Interviews"])
app.include_router(candidates.router, prefix="/api/candidates", tags=["Candidates"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(audio.router, prefix="/api/audio", tags=["Audio"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(uploads.router, prefix="/api", tags=["Uploads"])

# Include WebSocket router (not under /api prefix)
app.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)
