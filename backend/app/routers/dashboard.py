from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import extract, func
from sqlalchemy.orm import Session, joinedload
from app.dependencies import get_db, get_current_user
from app.models.category import Category
from app.models.investment import Investment
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.dashboard import CategoryBreakdownItem, DashboardSummary, MonthlyChartItem
from app.schemas.transaction import TransactionResponse

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _current_month_year():
    today = date.today()
    return today.month, today.year


@router.get("/summary", response_model=DashboardSummary)
def summary(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    m, y = month or _current_month_year()[0], year or _current_month_year()[1]

    rows = (
        db.query(Transaction.type, func.sum(Transaction.amount).label("total"))
        .filter(
            extract("month", Transaction.date) == m,
            extract("year", Transaction.date) == y,
        )
        .group_by(Transaction.type)
        .all()
    )

    month_income = 0.0
    month_expense = 0.0
    for row in rows:
        if row.type == "income":
            month_income = float(row.total)
        elif row.type == "expense":
            month_expense = float(row.total)

    month_balance = month_income - month_expense
    savings_rate = (month_balance / month_income * 100) if month_income > 0 else 0.0

    investments = db.query(Investment).all()
    total_invested = sum(float(i.amount_invested) for i in investments)
    total_current = sum(float(i.current_value) for i in investments)

    return DashboardSummary(
        month_income=month_income,
        month_expense=month_expense,
        month_balance=month_balance,
        savings_rate=savings_rate,
        total_invested=total_invested,
        total_current_value=total_current,
        investment_gain_loss=total_current - total_invested,
    )


@router.get("/monthly-chart", response_model=list[MonthlyChartItem])
def monthly_chart(
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

    data: dict[str, dict] = {}
    for row in rows:
        m = row.month
        if m not in data:
            data[m] = {"income": 0.0, "expense": 0.0}
        data[m][row.type] = float(row.total)

    sorted_months = sorted(data.keys())[-months:]
    return [
        MonthlyChartItem(
            month=m,
            income=data[m].get("income", 0.0),
            expense=data[m].get("expense", 0.0),
            balance=data[m].get("income", 0.0) - data[m].get("expense", 0.0),
        )
        for m in sorted_months
    ]


@router.get("/category-breakdown", response_model=list[CategoryBreakdownItem])
def category_breakdown(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    type: str = Query("expense"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    m, y = month or _current_month_year()[0], year or _current_month_year()[1]

    rows = (
        db.query(
            Transaction.category_id,
            func.sum(Transaction.amount).label("total"),
        )
        .filter(
            Transaction.type == type,
            extract("month", Transaction.date) == m,
            extract("year", Transaction.date) == y,
        )
        .group_by(Transaction.category_id)
        .all()
    )

    grand_total = sum(float(r.total) for r in rows)
    result = []
    for row in rows:
        cat = db.query(Category).filter(Category.id == row.category_id).first() if row.category_id else None
        result.append(
            CategoryBreakdownItem(
                category_id=row.category_id,
                category_name=cat.name if cat else "Sem categoria",
                category_icon=cat.icon if cat else "📌",
                category_color=cat.color if cat else "#9CA3AF",
                total=float(row.total),
                percentage=(float(row.total) / grand_total * 100) if grand_total > 0 else 0.0,
            )
        )
    return sorted(result, key=lambda x: x.total, reverse=True)


@router.get("/recent-transactions", response_model=list[TransactionResponse])
def recent_transactions(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Transaction)
        .options(joinedload(Transaction.category))
        .order_by(Transaction.date.desc(), Transaction.created_at.desc())
        .limit(limit)
        .all()
    )
