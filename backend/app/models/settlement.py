from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Settlement(Base):
    """Acerto mensal do casal: registro de que o mês foi quitado.

    amount é o valor que payer transferiu para receiver para zerar a
    diferença das despesas compartilhadas daquele mês.
    """

    __tablename__ = "settlements"
    __table_args__ = (UniqueConstraint("month", "year", name="uq_settlements_month_year"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    payer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    receiver_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    payer: Mapped["User"] = relationship(foreign_keys=[payer_id])
    receiver: Mapped["User"] = relationship(foreign_keys=[receiver_id])
