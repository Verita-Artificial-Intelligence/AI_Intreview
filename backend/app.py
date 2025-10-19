from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
import logging
from config import CORS_ORIGINS
from database import shutdown_db_client
from routers import (
    auth_router,
    candidates_router,
    interviews_router,
    chat_router,
    audio_router,
    analysis_router,
    profile_router,
)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Root route
@api_router.get("/")
async def root():
    return {"message": "AI Interviewer API"}


# Include all routers
api_router.include_router(auth_router)
api_router.include_router(profile_router)
api_router.include_router(candidates_router)
api_router.include_router(interviews_router)
api_router.include_router(chat_router)
api_router.include_router(audio_router)
api_router.include_router(analysis_router)

# Include the router in the main app
app.include_router(api_router)

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


@app.on_event("shutdown")
async def shutdown():
    """Shutdown event handler"""
    await shutdown_db_client()
