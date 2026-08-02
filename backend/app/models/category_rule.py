from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class CategoryRule(Base):
    """Regra de categorização automática: descrição contém `pattern` → categoria.

    Aplicada em imports (OFX / Open Finance) e sugerida na criação manual.
    Case-insensitive; a regra com pattern mais longo vence (mais específica).
    """

    __tablename__ = "category_rules"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    pattern: Mapped[str] = mapped_column(String(120), nullable=False)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    category: Mapped["Category"] = relationship()
