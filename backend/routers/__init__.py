from .auth import router as auth_router
from .candidates import router as candidates_router
from .interviews import router as interviews_router
from .chat import router as chat_router
from .audio import router as audio_router
from .analysis import router as analysis_router
from .profile import router as profile_router

__all__ = [
    "auth_router",
    "candidates_router",
    "interviews_router",
    "chat_router",
    "audio_router",
    "analysis_router",
    "profile_router",
]
