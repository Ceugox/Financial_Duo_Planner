"""Orçamento mensal por categoria (padrão Honeydue/Mobills).

Um limite recorrente por categoria de despesa; o status do mês compara o
limite com o gasto realizado e sinaliza thresholds (80% / 100%).
"""
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import extract, func
from sqlalchemy.orm import Session, joinedload
from app.dependencies import get_db, get_current_user
from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User

router = APIRouter(prefix="/budgets", tags=["budgets"])


class BudgetUpsert(BaseModel):
    category_id: int
    amount: float = Field(gt=0)


class BudgetResponse(BaseModel):
    id: int
    category_id: int
    amount: float

    model_config = {"from_attributes": True}


class BudgetStatusItem(BaseModel):
    category_id: int
    category_name: str
    category_icon: str
    category_color: str
    budget: float
    spent: float
    remaining: float
    pct: float                 # 0-100+ (pode passar de 100)
    level: str                 # ok | warning (>=80%) | over (>=100%)


class BudgetStatus(BaseModel):
    month: int
    year: int
    total_budget: float
    total_spent: float
    items: list[BudgetStatusItem]
    unbudgeted_spent: float    # despesas do mês em categorias sem orçamento


def _level(pct: float) -> str:
    if pct >= 100:
        return "over"
    if pct >= 80:
        return "warning"
    return "ok"


@router.get("", response_model=list[BudgetResponse])
def list_budgets(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(Budget).order_by(Budget.id).all()


@router.put("", response_model=BudgetResponse)
def upsert_budget(
    body: BudgetUpsert,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    category = db.query(Category).filter(Category.id == body.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    if category.type == "income":
        raise HTTPException(status_code=400, detail="Orçamento só se aplica a categorias de despesa")

    budget = db.query(Budget).filter(Budget.category_id == body.category_id).first()
    if budget:
        budget.amount = body.amount
    else:
        budget = Budget(category_id=body.category_id, amount=body.amount)
        db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    category_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    budget = db.query(Budget).filter(Budget.category_id == category_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Categoria sem orçamento definido")
    db.delete(budget)
    db.commit()


@router.get("/status", response_model=BudgetStatus)
def budget_status(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    today = date.today()
    m, y = month or today.month, year or today.year

    budgets = db.query(Budget).options(joinedload(Budget.category)).all()

    spent_rows = (
        db.query(Transaction.category_id, func.sum(Transaction.amount).label("total"))
        .filter(
            Transaction.type == "expense",
            Transaction.is_transfer.is_(False),
            extract("month", Transaction.date) == m,
            extract("year", Transaction.date) == y,
        )
        .group_by(Transaction.category_id)
        .all()
    )
    spent_by_cat = {row.category_id: float(row.total) for row in spent_rows}

    items: list[BudgetStatusItem] = []
    for b in budgets:
        spent = spent_by_cat.get(b.category_id, 0.0)
        amount = float(b.amount)
        pct = (spent / amount * 100) if amount > 0 else 0.0
        items.append(BudgetStatusItem(
            category_id=b.category_id,
            category_name=b.category.name,
            category_icon=b.category.icon,
            category_color=b.category.color,
            budget=amount,
            spent=round(spent, 2),
            remaining=round(amount - spent, 2),
            pct=round(pct, 1),
            level=_level(pct),
        ))

    items.sort(key=lambda i: i.pct, reverse=True)
    budgeted_cats = {b.category_id for b in budgets}
    unbudgeted = sum(v for k, v in spent_by_cat.items() if k not in budgeted_cats)

    return BudgetStatus(
        month=m,
        year=y,
        total_budget=round(sum(i.budget for i in items), 2),
        total_spent=round(sum(i.spent for i in items), 2),
        items=items,
        unbudgeted_spent=round(unbudgeted, 2),
    )
