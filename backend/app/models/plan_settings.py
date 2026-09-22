from sqlalchemy import Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class PlanSettings(Base):
    """Premissas do plano financeiro compartilhado do casal (linha única, id=1)."""

    __tablename__ = "plan_settings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    inflation_rate: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False, default=4)
    annual_return_rate: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False, default=0)
    history_months: Mapped[int] = mapped_column(Integer, nullable=False, default=6)
