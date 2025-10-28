from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime, timezone
import uuid

AssignmentStatus = Literal["active", "completed", "removed"]


class Assignment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    candidate_id: str
    interview_id: str
    role: Optional[str] = None
    status: AssignmentStatus = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AssignmentCreate(BaseModel):
    project_id: str
    candidate_id: str
    role: Optional[str] = None
    status: AssignmentStatus = "active"


class BulkAssignmentCreate(BaseModel):
    assignments: List[AssignmentCreate]


class AssignmentPreviewItem(BaseModel):
    """Simplified assignment for preview - project_id comes from URL"""

    candidate_id: str
    role: Optional[str] = None


class BulkAssignmentPreview(BaseModel):
    assignments: List[AssignmentPreviewItem]
