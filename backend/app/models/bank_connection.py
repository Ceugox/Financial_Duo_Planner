from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class BankConnection(Base):
    """Conexão Open Finance via Pluggy (Meu Pluggy).

    Cada conexão bancária feita no meu.pluggy.ai vira um Item na Pluggy;
    guardamos o item_id e a quem pertence para sincronizar transações.
    """

    __tablename__ = "bank_connections"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    provider: Mapped[str] = mapped_column(String(20), default="pluggy", server_default="pluggy")
    item_id: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    nickname: Mapped[str] = mapped_column(String(100), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship()
