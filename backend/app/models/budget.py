from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Numeric, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Budget(Base):
    """Limite mensal de gasto por categoria (orçamento do casal).

    Um limite por categoria, recorrente todo mês — modelo dos apps de
    orçamento simples (Mobills/Organizze). O status é calculado por mês.
    """

    __tablename__ = "budgets"
    __table_args__ = (UniqueConstraint("category_id", name="uq_budgets_category"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    category: Mapped["Category"] = relationship()
