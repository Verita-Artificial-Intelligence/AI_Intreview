"""
Annotation Tasks: Tasks created FROM INTERVIEWS for human annotators to review.

This module defines annotation tasks that are created after candidates complete interviews.
These tasks are assigned to human annotators for quality assurance and data collection.

Use this when:
- Candidates have completed interviews and you need human QA/review
- Creating tasks for annotators to evaluate interview performance
- Tracking annotation work progress and quality ratings

Database Collection: annotation_tasks

Related: See annotation_data.py for enterprise-uploaded datasets (different use case)
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal, List, Dict, Any
from datetime import datetime, timezone
import uuid

# Annotation task status type definition
AnnotationTaskStatus = Literal[
    "pending",  # Task created, waiting for assignment
    "assigned",  # Task assigned to annotator
    "in_progress",  # Annotator started working
    "completed",  # Annotator submitted annotation
    "reviewed",  # Manager reviewed the annotation
]


class AnnotationTask(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    annotator_id: Optional[str] = None

    # Task metadata
    task_name: str  # Short name for the task (required)
    task_description: Optional[str] = None  # What the annotator should do (optional)
    instructions: str  # Specific instructions for annotation (required)

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
    annotator_id: Optional[str] = None
    task_name: str  # Required
    task_description: Optional[str] = None  # Optional
    instructions: str  # Required
    data_to_annotate: Dict[str, Any]
    status: Optional[AnnotationTaskStatus] = "assigned"


class AnnotationTaskUpdate(BaseModel):
    quality_rating: Optional[int] = None
    feedback_notes: Optional[str] = None
    status: Optional[AnnotationTaskStatus] = None


class AnnotationTaskAssign(BaseModel):
    annotator_id: str


class AnnotatorStats(BaseModel):
    """Aggregated statistics for an annotator"""

    annotator_id: str
    name: str
    total_tasks: int
    completed_tasks: int
    completion_rate: float  # Percentage (0-100)
    avg_rating: float  # Average quality rating (0-5)
