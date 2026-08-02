from datetime import datetime
from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class TransferRule(Base):
    """Conta oculta / transferência conhecida: descrição contém `pattern`
    → o import sugere como transferência (ex.: "99Pay", "PIC PAY").

    Cobre contas que o casal usa como reserva mas não conecta ao app —
    dinheiro que sai para lá não é gasto, é movimentação interna.
    """

    __tablename__ = "transfer_rules"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    pattern: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
