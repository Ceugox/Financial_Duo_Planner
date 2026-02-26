from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False, default="both")  # income|expense|both
    icon: Mapped[str] = mapped_column(String(10), nullable=False, default="📌")
    color: Mapped[str] = mapped_column(String(7), nullable=False, default="#6B7280")
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    transactions: Mapped[list["Transaction"]] = relationship(back_populates="category", lazy="select")
