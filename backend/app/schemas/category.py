from typing import Optional
from pydantic import BaseModel


class CategoryCreate(BaseModel):
    name: str
    type: str = "both"
    icon: str = "📌"
    color: str = "#6B7280"


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    type: str
    icon: str
    color: str
    is_default: bool

    model_config = {"from_attributes": True}
