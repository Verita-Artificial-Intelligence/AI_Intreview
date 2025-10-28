from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
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
    education: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CandidateCreate(BaseModel):
    name: str
    email: EmailStr
    skills: List[str]
    experience_years: int
    position: str
    bio: str
    education: str = ""


class CandidateUpdate(BaseModel):
    """Model for partial updates to candidates"""

    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    skills: Optional[List[str]] = None
    experience_years: Optional[int] = None
    position: Optional[str] = None
    bio: Optional[str] = None
    education: Optional[str] = None
