from datetime import date
from typing import Optional
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


@router.get("", response_model=list[TransactionResponse])
def list_transactions(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
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
    rows = (
        db.query(
            func.strftime("%Y-%m", Transaction.date).label("month"),
            Transaction.type,
            func.sum(Transaction.amount).label("total"),
        )
        .group_by("month", Transaction.type)
        .order_by("month")
        .all()
    )

    # Aggregate into dict
    data: dict[str, dict] = {}
    for row in rows:
        m = row.month
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
