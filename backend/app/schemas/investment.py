from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class InvestmentCreate(BaseModel):
    name: str
    asset_type: str  # acoes|fiis|renda_fixa|crypto|poupanca|fundos|outros
    amount_invested: float
    current_value: float
    quantity: Optional[float] = None
    purchase_date: Optional[date] = None
    broker: Optional[str] = None
    notes: Optional[str] = None


class InvestmentUpdate(BaseModel):
    name: Optional[str] = None
    asset_type: Optional[str] = None
    amount_invested: Optional[float] = None
    current_value: Optional[float] = None
    quantity: Optional[float] = None
    purchase_date: Optional[date] = None
    broker: Optional[str] = None
    notes: Optional[str] = None


class InvestmentResponse(BaseModel):
    id: int
    name: str
    asset_type: str
    amount_invested: float
    current_value: float
    quantity: Optional[float]
    purchase_date: Optional[date]
    broker: Optional[str]
    notes: Optional[str]
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InvestmentSummary(BaseModel):
    total_invested: float
    total_current: float
    gain_loss: float
    gain_loss_pct: float
    by_type: dict[str, float]
