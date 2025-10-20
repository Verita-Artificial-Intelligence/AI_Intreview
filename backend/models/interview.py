from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal, List, Dict, Any
from datetime import datetime, timezone
import uuid


# Interview status type definition
InterviewStatus = Literal[
    "not_started",  # Interview created but not begun
    "in_progress",  # Candidate is actively interviewing
    "completed",  # Interview finished by candidate
    "under_review",  # Being evaluated by system/reviewer
    "approved",  # Candidate passed
    "rejected",  # Candidate did not pass
]

# Analysis status type definition
AnalysisStatus = Literal[
    "pending",  # Analysis not yet started
    "processing",  # AI is currently analyzing
    "completed",  # Analysis finished successfully
    "failed",  # Analysis encountered an error
]


class Interview(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    candidate_id: str
    candidate_name: str
    position: str
    job_id: Optional[str] = None
    job_title: Optional[str] = None
    status: InterviewStatus = "not_started"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    summary: Optional[str] = None
    transcript: Optional[List[Dict[str, Any]]] = None
    analysis_status: Optional[AnalysisStatus] = None
    analysis_result: Optional[Dict[str, Any]] = None
    video_url: Optional[str] = None


class InterviewCreate(BaseModel):
    candidate_id: str
    job_id: Optional[str] = None
