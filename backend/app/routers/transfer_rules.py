"""Regras de conta oculta (descrição contém → sugerir como transferência)."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.models.transaction import Transaction
from app.models.transfer_rule import TransferRule
from app.models.user import User

router = APIRouter(prefix="/transfer-rules", tags=["transfer-rules"])


class TransferRuleCreate(BaseModel):
    pattern: str = Field(min_length=2, max_length=120)


class TransferRuleResponse(BaseModel):
    id: int
    pattern: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ApplyResult(BaseModel):
    updated: int


@router.get("", response_model=list[TransferRuleResponse])
def list_rules(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(TransferRule).order_by(TransferRule.pattern).all()


@router.post("", response_model=TransferRuleResponse, status_code=status.HTTP_201_CREATED)
def create_rule(body: TransferRuleCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    pattern = body.pattern.strip()
    duplicate = db.query(TransferRule).filter(TransferRule.pattern.ilike(pattern)).first()
    if duplicate:
        raise HTTPException(status_code=409, detail=f'Já existe regra para "{duplicate.pattern}"')

    rule = TransferRule(pattern=pattern)
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rule(rule_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rule = db.query(TransferRule).filter(TransferRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Regra não encontrada")
    db.delete(rule)
    db.commit()


@router.post("/{rule_id}/apply", response_model=ApplyResult)
def apply_rule_retroactively(
    rule_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Marca como transferência os lançamentos já confirmados que batem com a regra."""
    rule = db.query(TransferRule).filter(TransferRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Regra não encontrada")

    matches = (
        db.query(Transaction)
        .filter(Transaction.is_transfer.is_(False))
        .filter(Transaction.description.ilike(f"%{rule.pattern}%"))
        .all()
    )
    for tx in matches:
        tx.is_transfer = True
    db.commit()
    return ApplyResult(updated=len(matches))
