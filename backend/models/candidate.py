from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List
from datetime import datetime, timezone
import uuid


class Candidate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    skills: List[str]
    experience_years: int
    position: str
    bio: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CandidateCreate(BaseModel):
    name: str
    email: EmailStr
    skills: List[str]
    experience_years: int
    position: str
    bio: str
