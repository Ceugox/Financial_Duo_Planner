from datetime import date as date_type, datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator
from app.schemas.category import CategoryResponse


class TransactionCreate(BaseModel):
    type: Literal["income", "expense"]
    amount: float = Field(gt=0)
    description: str = Field(min_length=1, max_length=255)
    category_id: Optional[int] = None
    payment_method: Optional[str] = Field(default=None, max_length=50)
    date: date_type
    is_recurrent: bool = False
    recurrence_day: Optional[int] = None
    notes: Optional[str] = None

    @field_validator("category_id")
    @classmethod
    def validate_category_id(cls, value: Optional[int]) -> Optional[int]:
        if value is not None and value <= 0:
            raise ValueError("category_id deve ser positivo")
        return value

    @field_validator("recurrence_day")
    @classmethod
    def validate_recurrence_day(cls, value: Optional[int]) -> Optional[int]:
        if value is not None and not 1 <= value <= 31:
            raise ValueError("recurrence_day deve ficar entre 1 e 31")
        return value


class TransactionUpdate(BaseModel):
    type: Optional[Literal["income", "expense"]] = None
    amount: Optional[float] = Field(default=None, gt=0)
    description: Optional[str] = Field(default=None, min_length=1, max_length=255)
    category_id: Optional[int] = None
    payment_method: Optional[str] = Field(default=None, max_length=50)
    date: Optional[date_type] = None
    is_recurrent: Optional[bool] = None
    recurrence_day: Optional[int] = None
    notes: Optional[str] = None

    @field_validator("category_id")
    @classmethod
    def validate_category_id(cls, value: Optional[int]) -> Optional[int]:
        if value is not None and value <= 0:
            raise ValueError("category_id deve ser positivo")
        return value

    @field_validator("recurrence_day")
    @classmethod
    def validate_recurrence_day(cls, value: Optional[int]) -> Optional[int]:
        if value is not None and not 1 <= value <= 31:
            raise ValueError("recurrence_day deve ficar entre 1 e 31")
        return value


class TransactionResponse(BaseModel):
    id: int
    type: Literal["income", "expense"]
    amount: float
    description: str
    category_id: Optional[int]
    category: Optional[CategoryResponse]
    payment_method: Optional[str]
    date: date_type
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
