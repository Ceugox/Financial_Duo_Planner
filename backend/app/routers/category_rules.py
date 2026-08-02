"""Regras de categorização automática (descrição contém → categoria)."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload
from app.dependencies import get_db, get_current_user
from app.models.category import Category
from app.models.category_rule import CategoryRule
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.category import CategoryResponse

router = APIRouter(prefix="/category-rules", tags=["category-rules"])


class RuleCreate(BaseModel):
    pattern: str = Field(min_length=2, max_length=120)
    category_id: int


class RuleResponse(BaseModel):
    id: int
    pattern: str
    category_id: int
    category: CategoryResponse
    created_at: datetime

    model_config = {"from_attributes": True}


class ApplyResult(BaseModel):
    updated: int


@router.get("", response_model=list[RuleResponse])
def list_rules(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(CategoryRule).options(joinedload(CategoryRule.category)).order_by(CategoryRule.pattern).all()


@router.post("", response_model=RuleResponse, status_code=status.HTTP_201_CREATED)
def create_rule(body: RuleCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    if not db.query(Category).filter(Category.id == body.category_id).first():
        raise HTTPException(status_code=404, detail="Categoria não encontrada")

    pattern = body.pattern.strip()
    duplicate = db.query(CategoryRule).filter(CategoryRule.pattern.ilike(pattern)).first()
    if duplicate:
        raise HTTPException(status_code=409, detail=f'Já existe regra para "{duplicate.pattern}"')

    rule = CategoryRule(pattern=pattern, category_id=body.category_id)
    db.add(rule)
    db.commit()
    db.refresh(rule, ["category"])
    return rule


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rule(rule_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rule = db.query(CategoryRule).filter(CategoryRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Regra não encontrada")
    db.delete(rule)
    db.commit()


@router.post("/{rule_id}/apply", response_model=ApplyResult)
def apply_rule_to_uncategorized(
    rule_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Aplica a regra retroativamente nas transações sem categoria."""
    rule = db.query(CategoryRule).filter(CategoryRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Regra não encontrada")

    matches = (
        db.query(Transaction)
        .filter(Transaction.category_id.is_(None))
        .filter(Transaction.description.ilike(f"%{rule.pattern}%"))
        .all()
    )
    for tx in matches:
        tx.category_id = rule.category_id
    db.commit()
    return ApplyResult(updated=len(matches))
