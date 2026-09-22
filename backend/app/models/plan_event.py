import datetime as dt
from typing import Optional
from sqlalchemy import Date, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class PlanEvent(Base):
    """Mudança futura de renda ou despesa no plano compartilhado do casal.

    user_id registra quem criou; leitura e edição são do espaço compartilhado.
    """

    __tablename__ = "plan_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    date: Mapped[dt.date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Optional[dt.date]] = mapped_column(Date, nullable=True)
    kind: Mapped[str] = mapped_column(String(10), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    recurrence: Mapped[str] = mapped_column(String(10), nullable=False, default="once")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
