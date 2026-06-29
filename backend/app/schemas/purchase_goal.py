from datetime import date, datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field, model_validator

Priority = Literal["alta", "media", "baixa"]


class PurchaseGoalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    target_amount: float = Field(gt=0)
    saved_amount: float = Field(default=0, ge=0)
    priority: Priority = "media"
    target_date: Optional[date] = None
    category: Optional[str] = Field(default=None, max_length=100)
    image_url: Optional[str] = Field(default=None, max_length=500)
    notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_saved_amount(self):
        if self.saved_amount > self.target_amount:
            raise ValueError("saved_amount não pode ser maior que target_amount")
        return self


class PurchaseGoalUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    target_amount: Optional[float] = Field(default=None, gt=0)
    saved_amount: Optional[float] = Field(default=None, ge=0)
    priority: Optional[Priority] = None
    target_date: Optional[date] = None
    category: Optional[str] = Field(default=None, max_length=100)
    image_url: Optional[str] = Field(default=None, max_length=500)
    notes: Optional[str] = None
    is_completed: Optional[bool] = None


class DepositRequest(BaseModel):
    amount: float = Field(gt=0)


class PurchaseGoalResponse(BaseModel):
    id: int
    name: str
    target_amount: float
    saved_amount: float
    priority: Priority
    target_date: Optional[date]
    category: Optional[str]
    image_url: Optional[str]
    notes: Optional[str]
    is_completed: bool
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
