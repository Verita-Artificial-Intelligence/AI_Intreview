from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, Literal, List, Dict, Any
from datetime import datetime, timezone
import uuid

# Import interview configuration types from job model
from .job import InterviewType, SkillDefinition


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
    candidate_id: Optional[str] = None
    candidate_name: Optional[str] = None
    position: Optional[str] = None
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
    audio_path: Optional[str] = None
    interview_type: InterviewType = "standard"
    skills: Optional[List[SkillDefinition]] = None
    custom_questions: Optional[List[str]] = None
    custom_exercise_prompt: Optional[str] = None
    resume_text: Optional[str] = None

    @field_validator('interview_type', mode='before')
    @classmethod
    def migrate_old_interview_types(cls, v):
        """Migrate deprecated interview types to standard"""
        # Map old types to new types
        migration_map = {
            'resume_based': 'standard',
            'software_engineer': 'standard',
            'coding_exercise': 'standard',
        }
        return migration_map.get(v, v)


class InterviewCreate(BaseModel):
    candidate_id: str
    job_id: Optional[str] = None
    resume_text: Optional[str] = None

    # Optional overrides - only use if creating interview without a job
    # If job_id is provided, these will be inherited from the job
    interview_type: InterviewType = "standard"
    skills: Optional[List[SkillDefinition]] = None
    custom_questions: Optional[List[str]] = None
    custom_exercise_prompt: Optional[str] = None
