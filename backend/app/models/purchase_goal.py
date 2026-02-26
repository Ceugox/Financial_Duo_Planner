from datetime import date, datetime
from typing import Optional
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class PurchaseGoal(Base):
    __tablename__ = "purchase_goals"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    target_amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    saved_amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False, default=0)
    priority: Mapped[str] = mapped_column(String(10), nullable=False, default="media")  # alta|media|baixa
    target_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="purchase_goals")
