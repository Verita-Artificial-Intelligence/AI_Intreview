from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import datetime, timezone
from typing import Optional, List, Literal
import uuid

InterviewType = Literal[
    "standard",
    "human_data",
    "custom_questions",
    "custom_exercise",
]


class SkillDefinition(BaseModel):
    name: str
    description: Optional[str] = None


class Job(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    position_type: str
    status: str = "open"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    pay_per_hour: Optional[float] = None

    # Interview configuration
    interview_type: InterviewType = "standard"
    skills: Optional[List[SkillDefinition]] = None
    custom_questions: Optional[List[str]] = None
    custom_exercise_prompt: Optional[str] = None

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


class JobCreate(BaseModel):
    title: str
    description: str
    position_type: str
    pay_per_hour: Optional[float] = None

    # Interview configuration
    interview_type: InterviewType = "standard"
    skills: Optional[List[SkillDefinition]] = None
    custom_questions: Optional[List[str]] = None
    custom_exercise_prompt: Optional[str] = None


class JobStatusUpdate(BaseModel):
    status: str
