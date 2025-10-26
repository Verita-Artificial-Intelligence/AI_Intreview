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
    chat,
    audio,
    websocket,
    uploads,
    jobs,
    annotations,
    annotation_data,
    earnings,
    admin,
)
from services.admin_data_service import AdminDataExplorerService

# Main application setup
app = FastAPI(
    title="AI Interview Platform API",
    description="API for managing AI-powered interviews, candidates, and analysis.",
    version="1.0.0",
)

# Add CORS middleware BEFORE including routers
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Event handlers for database connection
@app.on_event("startup")
async def startup():
    await AdminDataExplorerService.ensure_indexes()


@app.on_event("shutdown")
async def shutdown_db():
    await shutdown_db_client()


# Health check endpoint for ALB
@app.get("/health")
async def health_check():
    """
    Health check endpoint for AWS Application Load Balancer.
    Returns 200 OK if the service is running.
    """
    return {"status": "healthy", "service": "ai-interview-api"}


# Include all routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(profile.router, prefix="/api/profile", tags=["User Profile"])
app.include_router(interviews.router, prefix="/api/interviews", tags=["Interviews"])
app.include_router(candidates.router, prefix="/api/candidates", tags=["Candidates"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(annotations.router, prefix="/api/annotations", tags=["Annotations"])
app.include_router(
    annotation_data.router, prefix="/api/annotation-data", tags=["Annotation Data"]
)
app.include_router(earnings.router, prefix="/api/earnings", tags=["Earnings"])
app.include_router(audio.router, prefix="/api/audio", tags=["Audio"])
app.include_router(uploads.router, prefix="/api", tags=["Uploads"])
app.include_router(admin.router, prefix="/api", tags=["Admin"])

# Include WebSocket router (not under /api prefix)
app.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)
