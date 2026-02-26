from pydantic import BaseModel
from typing import Optional
from app.schemas.transaction import TransactionResponse


class DashboardSummary(BaseModel):
    month_income: float
    month_expense: float
    month_balance: float
    savings_rate: float
    total_invested: float
    total_current_value: float
    investment_gain_loss: float


class MonthlyChartItem(BaseModel):
    month: str
    income: float
    expense: float
    balance: float


class CategoryBreakdownItem(BaseModel):
    category_id: Optional[int]
    category_name: str
    category_icon: str
    category_color: str
    total: float
    percentage: float
