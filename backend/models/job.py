from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone
import uuid


class Job(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    position_type: str
    status: str = "open"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class JobCreate(BaseModel):
    title: str
    description: str
    position_type: str


class JobStatusUpdate(BaseModel):
    status: str
