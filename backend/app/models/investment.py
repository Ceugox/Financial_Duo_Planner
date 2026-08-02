from datetime import date, datetime
from typing import Optional
from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Investment(Base):
    __tablename__ = "investments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    asset_type: Mapped[str] = mapped_column(String(20), nullable=False)
    # acoes|fiis|renda_fixa|crypto|poupanca|fundos|outros
    amount_invested: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    current_value: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    quantity: Mapped[Optional[float]] = mapped_column(Numeric(15, 6), nullable=True)
    # Ticker p/ cotação automática: B3 via brapi (PETR4, MXRF11) ou id CoinGecko (bitcoin)
    ticker: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    # Posição sincronizada do Open Finance: "pluggy:{item_id}:{investment_id}"
    # (unicidade garantida em código; a coluna nasce por migração, sem constraint)
    external_id: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    source: Mapped[str] = mapped_column(String(20), default="manual", server_default="manual")  # manual|pluggy
    purchase_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    broker: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="investments")
