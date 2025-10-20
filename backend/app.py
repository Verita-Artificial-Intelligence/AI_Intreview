from fastapi import FastAPI, APIRouter
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
import logging
import os
from config import CORS_ORIGINS
from database import shutdown_db_client
from routers import (
    auth,
    profile,
    interviews,
    candidates,
    audio,
    websocket,
    uploads,
    jobs,
    annotations,
    annotation_data,
    earnings,
    admin,
)

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
    allow_origins=["*"],  # Allow all origins for development
    allow_methods=["*"],
    allow_headers=["*"],
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
app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(annotations.router, prefix="/api/annotations", tags=["Annotations"])
app.include_router(annotation_data.router, prefix="/api/annotation-data", tags=["Annotation Data"])
app.include_router(earnings.router, prefix="/api/earnings", tags=["Earnings"])
app.include_router(audio.router, prefix="/api/audio", tags=["Audio"])
app.include_router(uploads.router, prefix="/api", tags=["Uploads"])
app.include_router(admin.router, prefix="/api", tags=["Admin"])

# Include WebSocket router (not under /api prefix)
app.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])

# Mount static files for uploads
UPLOAD_DIR = "uploads"
if os.path.exists(UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
else:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)
