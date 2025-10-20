from fastapi import APIRouter, HTTPException
from typing import List, Optional, Union, cast

from database import db

router = APIRouter(prefix="/admin", tags=["Admin"])


def _normalize_recording_entry(entry: Union[str, dict, None]) -> Optional[str]:
    """
    Extract a usable video URL/path from various persistence formats.
    Supports plain strings, or objects with url/video_url/path fields.
    """
    if not entry:
        return None

    if isinstance(entry, str):
        return entry.strip() or None

    if isinstance(entry, dict):
        for key in ("url", "video_url", "path", "source"):
            value = entry.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()

    return None


def _collect_video_sources(interview_doc: dict) -> List[str]:
    """
    Assemble a list of candidate video sources from legacy and current fields.
    """
    sources: List[str] = []
    candidates: List[Union[str, dict]] = []

    if isinstance(interview_doc.get("video_recordings"), list):
        candidates.extend(cast(List[Union[str, dict]], interview_doc["video_recordings"]))

    if isinstance(interview_doc.get("video_urls"), list):
        candidates.extend(cast(List[Union[str, dict]], interview_doc["video_urls"]))

    if isinstance(interview_doc.get("recordings"), list):
        candidates.extend(cast(List[Union[str, dict]], interview_doc["recordings"]))

    single_url = interview_doc.get("video_url") or interview_doc.get("recording_url")
    if single_url:
        candidates.append(single_url)

    for candidate in candidates:
        normalized = _normalize_recording_entry(candidate)
        if normalized and normalized not in sources:
            sources.append(normalized)

    return sources


@router.get("/review/{interview_id}")
async def get_admin_review(interview_id: str):
    """
    Provide admin review metadata including available interview recordings.
    """
    interview_doc = await db.interviews.find_one({"id": interview_id}, {"_id": 0})
    if not interview_doc:
        raise HTTPException(status_code=404, detail="Interview not found")

    video_sources = _collect_video_sources(interview_doc)

    return {
        "interview_id": interview_id,
        "recordings": video_sources,
    }
