from . import (
    audio,
    auth,
    candidates,
    chat,
    interviews,
    jobs,
    annotations,
    annotation_data,
    earnings,
    profile,
    websocket,
    uploads,
    admin,
)

__all__ = [
    "auth_router",
    "candidates_router",
    "interviews_router",
    "jobs_router",
    "audio_router",
    "profile_router",
    "websocket_router",
]
