from datetime import date, datetime
from typing import Optional
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        Index("ix_transactions_date", "date"),
        Index("ix_transactions_type", "type"),
        Index("ix_transactions_category_id", "category_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    type: Mapped[str] = mapped_column(String(10), nullable=False)  # income|expense
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    category_id: Mapped[Optional[int]] = mapped_column(ForeignKey("categories.id"), nullable=True)
    payment_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    is_recurrent: Mapped[bool] = mapped_column(Boolean, default=False)
    recurrence_day: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="transactions")
    category: Mapped[Optional["Category"]] = relationship(back_populates="transactions")
