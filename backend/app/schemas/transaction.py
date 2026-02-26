from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel
from app.schemas.category import CategoryResponse


class TransactionCreate(BaseModel):
    type: str  # income|expense
    amount: float
    description: str
    category_id: Optional[int] = None
    payment_method: Optional[str] = None
    date: date
    is_recurrent: bool = False
    recurrence_day: Optional[int] = None
    notes: Optional[str] = None


class TransactionUpdate(BaseModel):
    type: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    payment_method: Optional[str] = None
    date: Optional[date] = None
    is_recurrent: Optional[bool] = None
    recurrence_day: Optional[int] = None
    notes: Optional[str] = None


class TransactionResponse(BaseModel):
    id: int
    type: str
    amount: float
    description: str
    category_id: Optional[int]
    category: Optional[CategoryResponse]
    payment_method: Optional[str]
    date: date
    is_recurrent: bool
    recurrence_day: Optional[int]
    notes: Optional[str]
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MonthlyTotals(BaseModel):
    month: str  # "YYYY-MM"
    income: float
    expense: float
    balance: float
