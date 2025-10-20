from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal, List, Dict, Any
from datetime import datetime, timezone
import uuid

# Annotation task status type definition
AnnotationTaskStatus = Literal[
    "pending",      # Task created, waiting for assignment
    "assigned",     # Task assigned to annotator
    "in_progress",  # Annotator started working
    "completed",    # Annotator submitted annotation
    "reviewed",     # Manager reviewed the annotation
]


class AnnotationTask(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    annotator_id: Optional[str] = None

    # Data to annotate (from an interview)
    data_to_annotate: Dict[str, Any]  # Contains transcript, video_url, audio_path, etc.

    # Status and timestamps
    status: AnnotationTaskStatus = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    assigned_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # Annotation results
    quality_rating: Optional[int] = None  # 1-5 scale
    feedback_notes: Optional[str] = None

    # Review
    review_status: Optional[str] = None  # "pending", "approved", "rejected"
    reviewed_at: Optional[datetime] = None
    reviewer_id: Optional[str] = None


class AnnotationTaskCreate(BaseModel):
    job_id: str
    data_to_annotate: Dict[str, Any]


class AnnotationTaskUpdate(BaseModel):
    quality_rating: Optional[int] = None
    feedback_notes: Optional[str] = None
    status: Optional[AnnotationTaskStatus] = None


class AnnotationTaskAssign(BaseModel):
    annotator_id: str
