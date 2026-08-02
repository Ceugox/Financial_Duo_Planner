from datetime import date, datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field

AssetType = Literal["acoes", "fiis", "renda_fixa", "crypto", "poupanca", "fundos", "outros"]


class InvestmentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    asset_type: AssetType
    amount_invested: float = Field(ge=0)
    current_value: float = Field(ge=0)
    quantity: Optional[float] = Field(default=None, gt=0)
    ticker: Optional[str] = Field(default=None, max_length=40)
    purchase_date: Optional[date] = None
    broker: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = None


class InvestmentUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    asset_type: Optional[AssetType] = None
    amount_invested: Optional[float] = Field(default=None, ge=0)
    current_value: Optional[float] = Field(default=None, ge=0)
    quantity: Optional[float] = Field(default=None, gt=0)
    ticker: Optional[str] = Field(default=None, max_length=40)
    purchase_date: Optional[date] = None
    broker: Optional[str] = Field(default=None, max_length=100)
    notes: Optional[str] = None


class InvestmentResponse(BaseModel):
    id: int
    name: str
    asset_type: AssetType
    amount_invested: float
    current_value: float
    quantity: Optional[float]
    ticker: Optional[str]
    purchase_date: Optional[date]
    broker: Optional[str]
    notes: Optional[str]
    source: str = "manual"
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
