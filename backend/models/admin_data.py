from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class AdminDataRecord(BaseModel):
    """Single row in the admin data explorer table."""

    model_config = ConfigDict(extra="ignore")

    id: str
    job_id: Optional[str] = None
    job_title: Optional[str] = None
    job_status: Optional[str] = None
    annotator_id: Optional[str] = None
    annotator_name: Optional[str] = None
    annotator_email: Optional[str] = None
    dataset_id: Optional[str] = None
    dataset_title: Optional[str] = None
    dataset_description: Optional[str] = None
    dataset_type: Optional[str] = None
    dataset_tags: List[str] = Field(default_factory=list)
    status: Optional[str] = None
    quality_rating: Optional[float] = None
    feedback_notes: Optional[str] = None
    task_name: Optional[str] = None
    created_at: Optional[str] = None
    assigned_at: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    last_activity_at: Optional[str] = None


class AdminDataPage(BaseModel):
    """Paginated response for admin data explorer requests."""

    model_config = ConfigDict(extra="ignore")

    items: List[AdminDataRecord]
    page: int
    page_size: int
    total: int
    total_pages: int
    has_next: bool
    has_previous: bool
    sort_by: str
    sort_dir: str
    applied_filters: Dict[str, Any] = Field(default_factory=dict)
