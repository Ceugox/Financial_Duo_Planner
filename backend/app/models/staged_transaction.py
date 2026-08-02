from datetime import date, datetime
from typing import Optional
from sqlalchemy import Date, DateTime, ForeignKey, Index, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class StagedTransaction(Base):
    """Sugestão de lançamento vinda do Open Finance / OFX.

    Nada aqui entra em dashboard, orçamento, acerto ou insights: o casal
    revisa e aceita (vira Transaction) ou descarta. A linha permanece para
    o dedupe por external_id não reimportar o que foi descartado.
    """

    __tablename__ = "staged_transactions"
    __table_args__ = (Index("ix_staged_status", "status"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    external_id: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    source: Mapped[str] = mapped_column(String(20), nullable=False)  # pluggy|ofx
    type: Mapped[str] = mapped_column(String(10), nullable=False)    # income|expense
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    suggested_category_id: Mapped[Optional[int]] = mapped_column(ForeignKey("categories.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(12), default="pending", server_default="pending")
    # pending|accepted|dismissed
    transaction_id: Mapped[Optional[int]] = mapped_column(ForeignKey("transactions.id"), nullable=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    suggested_category: Mapped[Optional["Category"]] = relationship()
