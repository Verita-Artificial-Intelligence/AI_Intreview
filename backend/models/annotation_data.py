"""
Annotation Data: Enterprise-uploaded data (images, videos, documents) that needs annotation.

This module defines datasets uploaded by administrators/enterprises for external annotation work.
This is separate from interview-based annotation tasks.

Use this when:
- Admins upload external datasets (images, videos, documents) for annotation
- Creating annotation work from non-interview sources
- Managing enterprise data labeling projects

Database Collection: annotation_data

Related: See annotation.py for interview-based annotation tasks (different use case)
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal, Dict, Any
from datetime import datetime, timezone
import uuid

DataType = Literal["text", "image", "video", "audio", "document"]


class AnnotationData(BaseModel):
    """Data uploaded by enterprises that needs to be annotated"""

    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_id: str
    title: str
    description: Optional[str] = None
    data_type: DataType
    data_url: Optional[str] = None  # URL to file/resource
    data_content: Optional[Dict[str, Any]] = None  # Inline data (for text, etc.)
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None


class AnnotationDataCreate(BaseModel):
    job_id: str
    title: str  # Will be used as task_name
    description: Optional[str] = None  # Will be used as task_description
    instructions: str  # Required for annotation tasks
    data_type: DataType
    data_url: Optional[str] = None
    data_content: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
