from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class PurchaseGoalCreate(BaseModel):
    name: str
    target_amount: float
    saved_amount: float = 0
    priority: str = "media"  # alta|media|baixa
    target_date: Optional[date] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    notes: Optional[str] = None


class PurchaseGoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[float] = None
    saved_amount: Optional[float] = None
    priority: Optional[str] = None
    target_date: Optional[date] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    notes: Optional[str] = None
    is_completed: Optional[bool] = None


class DepositRequest(BaseModel):
    amount: float


class PurchaseGoalResponse(BaseModel):
    id: int
    name: str
    target_amount: float
    saved_amount: float
    priority: str
    target_date: Optional[date]
    category: Optional[str]
    image_url: Optional[str]
    notes: Optional[str]
    is_completed: bool
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
