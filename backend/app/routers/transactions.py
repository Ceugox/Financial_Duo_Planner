from datetime import date
from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import extract, func
from sqlalchemy.orm import Session, joinedload
from app.dependencies import get_db, get_current_user
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import (
    MonthlyTotals,
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])


def sync_transaction_recurrence(tx: Transaction) -> None:
    if tx.is_recurrent:
        tx.recurrence_day = tx.recurrence_day or tx.date.day
    else:
        tx.recurrence_day = None


@router.get("", response_model=list[TransactionResponse])
def list_transactions(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    type: Optional[Literal["income", "expense"]] = Query(None),
    search: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        db.query(Transaction)
        .options(joinedload(Transaction.category))
    )
    if month:
        q = q.filter(extract("month", Transaction.date) == month)
    if year:
        q = q.filter(extract("year", Transaction.date) == year)
    if category_id:
        q = q.filter(Transaction.category_id == category_id)
    if type:
        q = q.filter(Transaction.type == type)
    if search:
        q = q.filter(Transaction.description.ilike(f"%{search}%"))
    if user_id:
        q = q.filter(Transaction.user_id == user_id)

    total = q.count()
    items = q.order_by(Transaction.date.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return items


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    body: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tx = Transaction(**body.model_dump(), user_id=current_user.id)
    sync_transaction_recurrence(tx)
    db.add(tx)
    db.commit()
    db.refresh(tx)
    db.refresh(tx, ["category"])
    return tx


@router.get("/monthly-totals", response_model=list[MonthlyTotals])
def monthly_totals(
    months: int = Query(12, ge=1, le=24),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    year_part = extract("year", Transaction.date)
    month_part = extract("month", Transaction.date)
    rows = (
        db.query(
            year_part.label("year"),
            month_part.label("month"),
            Transaction.type,
            func.sum(Transaction.amount).label("total"),
        )
        .group_by(year_part, month_part, Transaction.type)
        .order_by(year_part, month_part)
        .all()
    )

    # Aggregate into dict
    data: dict[str, dict] = {}
    for row in rows:
        m = f"{int(row.year):04d}-{int(row.month):02d}"
        if m not in data:
            data[m] = {"income": 0.0, "expense": 0.0}
        data[m][row.type] = float(row.total)

    # Return last N months
    sorted_months = sorted(data.keys())[-months:]
    result = []
    for m in sorted_months:
        inc = data[m].get("income", 0.0)
        exp = data[m].get("expense", 0.0)
        result.append(MonthlyTotals(month=m, income=inc, expense=exp, balance=inc - exp))
    return result


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tx = (
        db.query(Transaction)
        .options(joinedload(Transaction.category))
        .filter(Transaction.id == transaction_id)
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    return tx


@router.put("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int,
    body: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tx = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(tx, field, value)
    sync_transaction_recurrence(tx)
    db.commit()
    db.refresh(tx)
    db.refresh(tx, ["category"])
    return tx


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tx = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    db.delete(tx)
    db.commit()
