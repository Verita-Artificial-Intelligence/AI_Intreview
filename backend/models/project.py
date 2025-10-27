from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime, timezone
import uuid

ProjectStatus = Literal["active", "completed", "archived"]


class RoleDefinition(BaseModel):
    name: str
    count: int  # How many of this role needed
    description: Optional[str] = None


class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    status: ProjectStatus = "active"
    capacity: int  # Total number of candidates needed
    roles: Optional[List[RoleDefinition]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    capacity: int
    roles: Optional[List[RoleDefinition]] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    capacity: Optional[int] = None
    roles: Optional[List[RoleDefinition]] = None
