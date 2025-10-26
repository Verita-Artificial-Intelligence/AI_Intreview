from datetime import datetime, timezone
from typing import List, Optional, Sequence, Union, cast

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from database import db
from models import AdminDataPage
from services.admin_data_service import AdminDataExplorerService, AdminDataFilters

router = APIRouter(prefix="/admin", tags=["Admin"])


def _coerce_tags(raw: Optional[Sequence[str]]) -> List[str]:
    if not raw:
        return []
    tags: List[str] = []
    for value in raw:
        if value is None:
            continue
        for token in str(value).split(","):
            cleaned = token.strip()
            if cleaned:
                tags.append(cleaned)
    return tags


def _coerce_statuses(raw: Optional[Sequence[str]]) -> List[str]:
    if not raw:
        return []
    statuses: List[str] = []
    for value in raw:
        if value is None:
            continue
        for token in str(value).split(","):
            cleaned = token.strip()
            if cleaned:
                statuses.append(cleaned)
    return statuses


def _iso(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


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
        candidates.extend(
            cast(List[Union[str, dict]], interview_doc["video_recordings"])
        )

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


@router.get("/data", response_model=AdminDataPage)
async def get_admin_data_overview(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    sort_by: Optional[str] = Query("created_at"),
    sort_dir: Optional[str] = Query("desc"),
    job_id: Optional[str] = Query(None),
    annotator_id: Optional[str] = Query(None),
    status: Optional[Sequence[str]] = Query(None),
    tags: Optional[Sequence[str]] = Query(None),
    search: Optional[str] = Query(None),
    rating_min: Optional[float] = Query(None, ge=0),
    rating_max: Optional[float] = Query(None, ge=0),
    created_from: Optional[datetime] = Query(None),
    created_to: Optional[datetime] = Query(None),
    completed_from: Optional[datetime] = Query(None),
    completed_to: Optional[datetime] = Query(None),
    assigned_from: Optional[datetime] = Query(None),
    assigned_to: Optional[datetime] = Query(None),
):
    filters = AdminDataFilters(
        job_id=job_id,
        annotator_id=annotator_id,
        tags=_coerce_tags(tags),
        statuses=_coerce_statuses(status),
        search=search,
        rating_min=rating_min,
        rating_max=rating_max,
        created_from=_iso(created_from),
        created_to=_iso(created_to),
        completed_from=_iso(completed_from),
        completed_to=_iso(completed_to),
        assigned_from=_iso(assigned_from),
        assigned_to=_iso(assigned_to),
    )

    return await AdminDataExplorerService.get_paginated_records(
        filters=filters,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )


@router.get("/data/export")
async def export_admin_data(
    export_format: str = Query("csv", alias="format"),
    sort_by: Optional[str] = Query("created_at"),
    sort_dir: Optional[str] = Query("desc"),
    job_id: Optional[str] = Query(None),
    annotator_id: Optional[str] = Query(None),
    status: Optional[Sequence[str]] = Query(None),
    tags: Optional[Sequence[str]] = Query(None),
    search: Optional[str] = Query(None),
    rating_min: Optional[float] = Query(None, ge=0),
    rating_max: Optional[float] = Query(None, ge=0),
    created_from: Optional[datetime] = Query(None),
    created_to: Optional[datetime] = Query(None),
    completed_from: Optional[datetime] = Query(None),
    completed_to: Optional[datetime] = Query(None),
    assigned_from: Optional[datetime] = Query(None),
    assigned_to: Optional[datetime] = Query(None),
):
    filters = AdminDataFilters(
        job_id=job_id,
        annotator_id=annotator_id,
        tags=_coerce_tags(tags),
        statuses=_coerce_statuses(status),
        search=search,
        rating_min=rating_min,
        rating_max=rating_max,
        created_from=_iso(created_from),
        created_to=_iso(created_to),
        completed_from=_iso(completed_from),
        completed_to=_iso(completed_to),
        assigned_from=_iso(assigned_from),
        assigned_to=_iso(assigned_to),
    )

    stream, media_type, filename = await AdminDataExplorerService.stream_export(
        filters=filters,
        sort_by=sort_by,
        sort_dir=sort_dir,
        export_format=export_format,
    )

    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(stream, media_type=media_type, headers=headers)


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
