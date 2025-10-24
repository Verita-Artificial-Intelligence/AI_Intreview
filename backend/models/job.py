from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import datetime, timezone
from typing import Optional, List, Literal
import uuid
from config_definitions.interview_type_definitions import DEPRECATED_INTERVIEW_TYPES

InterviewType = Literal[
    "standard",
    "human_data",
    "custom_questions",
    "custom_exercise",
]

JobStatus = Literal["pending", "in_progress", "completed", "archived"]


class SkillDefinition(BaseModel):
    name: str
    description: Optional[str] = None


class Job(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    position_type: str
    status: JobStatus = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    pay_per_hour: Optional[float] = None
    availability: Optional[str] = None

    # Interview configuration
    interview_type: InterviewType = "standard"
    skills: Optional[List[SkillDefinition]] = None
    custom_questions: Optional[List[str]] = None
    custom_exercise_prompt: Optional[str] = None

    @field_validator('interview_type', mode='before')
    @classmethod
    def migrate_old_interview_types(cls, v):
        """Migrate deprecated interview types using centralized config"""
        return DEPRECATED_INTERVIEW_TYPES.get(v, v)

    @field_validator('status', mode='before')
    @classmethod
    def migrate_old_statuses(cls, v):
        """Migrate old status values to new workflow statuses"""
        # Map old statuses to new statuses
        migration_map = {
            'open': 'pending',
            'closed': 'archived',
        }
        return migration_map.get(v, v)


class JobCreate(BaseModel):
    title: str
    description: str
    position_type: str
    pay_per_hour: Optional[float] = None
    availability: Optional[str] = None

    # Interview configuration
    interview_type: InterviewType = "standard"
    skills: Optional[List[SkillDefinition]] = None
    custom_questions: Optional[List[str]] = None
    custom_exercise_prompt: Optional[str] = None


class JobStatusUpdate(BaseModel):
    status: JobStatus
