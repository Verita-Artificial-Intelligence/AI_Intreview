from . import (
    analysis,
    audio,
    auth,
    candidates,
    chat,
    interviews,
    jobs,
    profile,
    websocket,
    uploads,
)

__all__ = [
    "auth_router",
    "candidates_router",
    "interviews_router",
    "jobs_router",
    "chat_router",
    "audio_router",
    "analysis_router",
    "profile_router",
    "websocket_router",
]
