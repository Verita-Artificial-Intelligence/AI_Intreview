from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
from datetime import datetime, timezone
import uuid


class User(BaseModel):
    """Unified User/Candidate model combining authentication and profile data"""

    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

    # Authentication fields
    username: Optional[str] = None  # Auto-generated from email if not provided
    email: EmailStr

    # Profile fields (optional until profile is completed)
    name: Optional[str] = None
    position: Optional[str] = None
    skills: Optional[List[str]] = None
    expertise: Optional[List[str]] = None  # Creative skills/specialties
    experience_years: Optional[int] = None
    bio: Optional[str] = None

    # Additional profile sections
    education: Optional[List[dict]] = None
    work_experience: Optional[List[dict]] = None
    projects: Optional[List[dict]] = None
    publications: Optional[List[dict]] = None
    certifications: Optional[List[dict]] = None
    resume_url: Optional[str] = None

    # Interview tracking
    interview_id: Optional[str] = None
    profile_completed: bool = False

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserCreate(BaseModel):
    """User registration - only auth fields required"""

    email: EmailStr
    password: str


class UserLogin(BaseModel):
    """User login credentials"""

    email: EmailStr
    password: str


class ProfileComplete(BaseModel):
    """Profile completion data"""

    # Required fields
    name: str
    bio: str
    expertise: List[str]

    # Optional fields - using simpler Pydantic v2 syntax
    position: str | None = None
    skills: List[str] | None = None
    experience_years: int | None = None
    education: List[dict] | None = None
    work_experience: List[dict] | None = None
    projects: List[dict] | None = None
    publications: List[dict] | None = None
    certifications: List[dict] | None = None
    resume_url: str | None = None
