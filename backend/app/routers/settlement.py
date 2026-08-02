"""Acerto mensal do casal.

Modelo (padrão Zeta/Splitwise, adaptado a 2 pessoas):
- Despesas com is_shared=True são do casal; cada um deve a sua fração.
- Fração padrão: proporcional à renda do mês de cada um (padrão Zeta);
  se ninguém teve receita no mês, 50/50.
- Saldo = quanto cada um pagou de compartilhado - quanto deveria pagar.
  Quem pagou de menos transfere a diferença para quem pagou de mais.
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import extract, func
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.models.settlement import Settlement
from app.models.transaction import Transaction
from app.models.user import User

router = APIRouter(prefix="/settlement", tags=["settlement"])


class MemberBreakdown(BaseModel):
    user_id: int
    name: str
    income: float
    share_pct: float          # fração das despesas do casal que cabe a ele/ela
    shared_paid: float        # quanto pagou de despesas compartilhadas
    shared_owed: float        # quanto deveria ter pagado
    net: float                # positivo = pagou a mais (tem a receber)


class SettlementRecord(BaseModel):
    id: int
    month: int
    year: int
    payer_id: int
    receiver_id: int
    amount: float
    created_at: datetime

    model_config = {"from_attributes": True}


class SettlementStatus(BaseModel):
    month: int
    year: int
    total_shared: float
    members: list[MemberBreakdown]
    transfer_from: Optional[int]   # user_id de quem deve transferir
    transfer_to: Optional[int]
    transfer_amount: float
    settled: bool
    settlement: Optional[SettlementRecord]


class SettleRequest(BaseModel):
    month: int = Field(ge=1, le=12)
    year: int = Field(ge=2000, le=2100)


def _compute_status(db: Session, month: int, year: int) -> SettlementStatus:
    users = db.query(User).filter(User.is_active.is_(True)).order_by(User.id).all()

    month_filter = (
        extract("month", Transaction.date) == month,
        extract("year", Transaction.date) == year,
    )

    incomes: dict[int, float] = {}
    shared_paid: dict[int, float] = {}
    for user in users:
        income = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(Transaction.user_id == user.id, Transaction.type == "income", *month_filter)
            .scalar()
        )
        paid = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.user_id == user.id,
                Transaction.type == "expense",
                Transaction.is_shared.is_(True),
                *month_filter,
            )
            .scalar()
        )
        incomes[user.id] = float(income)
        shared_paid[user.id] = float(paid)

    total_income = sum(incomes.values())
    total_shared = sum(shared_paid.values())

    members: list[MemberBreakdown] = []
    for user in users:
        share_pct = (incomes[user.id] / total_income) if total_income > 0 else (1 / len(users) if users else 0)
        owed = total_shared * share_pct
        members.append(MemberBreakdown(
            user_id=user.id,
            name=user.name,
            income=incomes[user.id],
            share_pct=round(share_pct * 100, 1),
            shared_paid=shared_paid[user.id],
            shared_owed=round(owed, 2),
            net=round(shared_paid[user.id] - owed, 2),
        ))

    transfer_from = transfer_to = None
    transfer_amount = 0.0
    if len(members) == 2:
        creditor = max(members, key=lambda m: m.net)
        debtor = min(members, key=lambda m: m.net)
        if creditor.net > 0.01 and debtor.net < -0.01:
            transfer_from = debtor.user_id
            transfer_to = creditor.user_id
            transfer_amount = round(min(creditor.net, -debtor.net), 2)

    record = (
        db.query(Settlement)
        .filter(Settlement.month == month, Settlement.year == year)
        .first()
    )

    return SettlementStatus(
        month=month,
        year=year,
        total_shared=round(total_shared, 2),
        members=members,
        transfer_from=transfer_from,
        transfer_to=transfer_to,
        transfer_amount=transfer_amount,
        settled=record is not None,
        settlement=record,
    )


@router.get("", response_model=SettlementStatus)
def settlement_status(
    month: int = Query(ge=1, le=12),
    year: int = Query(ge=2000, le=2100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return _compute_status(db, month, year)


@router.post("", response_model=SettlementStatus, status_code=status.HTTP_201_CREATED)
def settle_month(
    body: SettleRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Registra o acerto do mês com os valores calculados agora."""
    current = _compute_status(db, body.month, body.year)
    if current.settled:
        raise HTTPException(status_code=409, detail="Este mês já foi acertado")
    if not current.transfer_from or not current.transfer_to or current.transfer_amount <= 0:
        raise HTTPException(status_code=400, detail="Não há diferença a acertar neste mês")

    db.add(Settlement(
        month=body.month,
        year=body.year,
        payer_id=current.transfer_from,
        receiver_id=current.transfer_to,
        amount=current.transfer_amount,
    ))
    db.commit()
    return _compute_status(db, body.month, body.year)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def unsettle_month(
    month: int = Query(ge=1, le=12),
    year: int = Query(ge=2000, le=2100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Desfaz o registro de acerto (ex.: lançou despesa atrasada no mês)."""
    record = db.query(Settlement).filter(Settlement.month == month, Settlement.year == year).first()
    if not record:
        raise HTTPException(status_code=404, detail="Mês sem acerto registrado")
    db.delete(record)
    db.commit()
