from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal
from datetime import datetime, timezone
import uuid

EarningStatus = Literal["pending", "paid"]


class Earning(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    task_id: str
    job_id: str
    amount: float
    status: EarningStatus = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    paid_at: Optional[datetime] = None


class EarningsSummary(BaseModel):
    """Summary of earnings for a user"""

    total_earnings: float
    pending_payout: float
    available_balance: float
    completed_tasks_count: int
    earnings_this_month: float
