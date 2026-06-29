from typing import Literal, Optional
from pydantic import BaseModel, Field

CategoryType = Literal["income", "expense", "both"]


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    type: CategoryType = "both"
    icon: str = Field(default="📌", min_length=1, max_length=8)
    color: str = Field(default="#6B7280", pattern=r"^#[0-9A-Fa-f]{6}$")


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    type: Optional[CategoryType] = None
    icon: Optional[str] = Field(default=None, min_length=1, max_length=8)
    color: Optional[str] = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")


class CategoryResponse(BaseModel):
    id: int
    name: str
    type: CategoryType
    icon: str
    color: str
    is_default: bool

    model_config = {"from_attributes": True}
