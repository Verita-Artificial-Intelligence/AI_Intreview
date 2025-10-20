from . import (
    audio,
    auth,
    candidates,
    interviews,
    jobs,
    annotations,
    annotation_data,
    earnings,
    profile,
    websocket,
    uploads,
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
