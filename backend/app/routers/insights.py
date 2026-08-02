"""Insights heurísticos, previsão de fim de mês e assinaturas.

Sem LLM em runtime: detectores estatísticos no padrão Rocket Money/Monarch.
Limiar duplo nos insights de variação (>=25% E >=R$100) para evitar ruído.
"""
from calendar import monthrange
from datetime import date, timedelta
from statistics import mean, pstdev
from typing import Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import extract, func
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.models.budget import Budget
from app.models.category import Category
from app.models.settlement import Settlement
from app.models.transaction import Transaction
from app.models.user import User
from app.services.recurring import detect_series, normalize_description

router = APIRouter(prefix="/insights", tags=["insights"])


# ─── Schemas ─────────────────────────────────────────────────────────────────

class Insight(BaseModel):
    kind: str                  # spending_up|spending_down|budget|price_increase|duplicate|record|savings|couple|big_expense
    severity: str              # positive|info|warning|critical
    title: str
    detail: str
    amount: Optional[float] = None
    category_icon: Optional[str] = None


class ForecastDay(BaseModel):
    day: int
    actual: Optional[float] = None      # despesa acumulada até o dia (passado)
    projected: Optional[float] = None   # projeção acumulada (futuro)


class Forecast(BaseModel):
    month: int
    year: int
    is_current_month: bool
    days_elapsed: int
    days_remaining: int
    spent_so_far: float
    income_so_far: float
    committed_remaining: float          # recorrências esperadas ainda não lançadas
    variable_daily_rate: float          # gasto variável médio/dia (90 dias)
    projected_expense: float
    projected_income: float
    projected_balance: float
    safe_to_spend_total: float          # o que dá para gastar até o fim sem fechar negativo
    safe_to_spend_daily: float
    series: list[ForecastDay]


class SubscriptionItem(BaseModel):
    description: str
    cadence: str
    expected_amount: float
    last_amount: float
    last_date: date
    expected_day: int
    occurrences: int
    monthly_cost: float
    price_increased: bool
    price_change: float
    active: bool
    category_name: Optional[str] = None
    category_icon: Optional[str] = None


class SubscriptionsResponse(BaseModel):
    total_monthly: float
    active_count: int
    items: list[SubscriptionItem]


class MonthPoint(BaseModel):
    month: str                  # "YYYY-MM"
    expense: float
    income: float


class CategoryTrend(BaseModel):
    category_id: Optional[int]
    category_name: str
    category_icon: str
    category_color: str
    avg_monthly: float          # média dos meses fechados
    current_month: float
    share_pct: float            # participação no gasto do período
    delta_pct_vs_avg: float     # mês atual vs média (0 se sem média)
    series: list[float]         # um valor por mês, alinhado a months_axis


class ConcernItem(BaseModel):
    kind: str                   # category_above_avg|over_budget|concentration
    title: str
    detail: str
    amount: float
    category_icon: Optional[str] = None


class SpendingAnalysis(BaseModel):
    months_axis: list[str]      # "YYYY-MM" do mais antigo ao atual
    monthly: list[MonthPoint]
    avg_expense: float          # média dos meses fechados do período
    avg_daily_expense: float
    highest_month: Optional[MonthPoint]
    lowest_month: Optional[MonthPoint]
    categories: list[CategoryTrend]
    concerns: list[ConcernItem]


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _month_expenses_by_category(db: Session, month: int, year: int) -> dict[Optional[int], float]:
    rows = (
        db.query(Transaction.category_id, func.sum(Transaction.amount).label("total"))
        .filter(
            Transaction.type == "expense",
            Transaction.is_transfer.is_(False),
            extract("month", Transaction.date) == month,
            extract("year", Transaction.date) == year,
        )
        .group_by(Transaction.category_id)
        .all()
    )
    return {r.category_id: float(r.total) for r in rows}


def _month_total(db: Session, month: int, year: int, tx_type: str) -> float:
    total = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.type == tx_type,
            Transaction.is_transfer.is_(False),
            extract("month", Transaction.date) == month,
            extract("year", Transaction.date) == year,
        )
        .scalar()
    )
    return float(total)


def _prev_month(month: int, year: int) -> tuple[int, int]:
    return (12, year - 1) if month == 1 else (month - 1, year)


def _brl(value: float) -> str:
    formatted = f"{value:,.2f}".replace(",", "@").replace(".", ",").replace("@", ".")
    return f"R$ {formatted}"


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("", response_model=list[Insight])
def insights_feed(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    today = date.today()
    m, y = month or today.month, year or today.year
    pm, py = _prev_month(m, y)
    insights: list[Insight] = []

    # 1. Variação do gasto total vs mês anterior (>=15% e >=R$100)
    expense_now = _month_total(db, m, y, "expense")
    expense_prev = _month_total(db, pm, py, "expense")
    if expense_prev > 0 and expense_now > 0:
        delta = expense_now - expense_prev
        pct = delta / expense_prev * 100
        if abs(pct) >= 15 and abs(delta) >= 100:
            up = delta > 0
            insights.append(Insight(
                kind="spending_up" if up else "spending_down",
                severity="warning" if up else "positive",
                title=f"Gastos {'subiram' if up else 'caíram'} {abs(pct):.0f}%",
                detail=f"{_brl(expense_now)} este mês vs {_brl(expense_prev)} no anterior ({'+' if up else '−'}{_brl(abs(delta))}).",
                amount=round(delta, 2),
            ))

    # 2. Categorias com variação vs média dos 3 meses anteriores (>=25% e >=R$100)
    current_by_cat = _month_expenses_by_category(db, m, y)
    history: list[dict[Optional[int], float]] = []
    hm, hy = m, y
    for _i in range(3):
        hm, hy = _prev_month(hm, hy)
        history.append(_month_expenses_by_category(db, hm, hy))
    cats = {c.id: c for c in db.query(Category).all()}

    cat_changes = []
    for cat_id, total in current_by_cat.items():
        prior = [h.get(cat_id, 0.0) for h in history]
        avg = mean(prior) if any(p > 0 for p in prior) else 0.0
        if avg <= 0:
            continue
        delta = total - avg
        pct = delta / avg * 100
        if abs(pct) >= 25 and abs(delta) >= 100:
            cat_changes.append((abs(delta), delta, pct, cat_id, total, avg))
    cat_changes.sort(reverse=True)
    for _absd, delta, pct, cat_id, total, avg in cat_changes[:3]:
        cat = cats.get(cat_id)
        name = cat.name if cat else "Sem categoria"
        up = delta > 0
        insights.append(Insight(
            kind="spending_up" if up else "spending_down",
            severity="warning" if up else "positive",
            title=f"{name} {'+' if up else '−'}{abs(pct):.0f}% vs média",
            detail=f"{_brl(total)} este mês; a média dos últimos 3 meses era {_brl(avg)}.",
            amount=round(delta, 2),
            category_icon=cat.icon if cat else None,
        ))

    # 3. Orçamentos em alerta (>=80%) ou estourados
    budgets = db.query(Budget).all()
    for b in budgets:
        spent = current_by_cat.get(b.category_id, 0.0)
        amount = float(b.amount)
        if amount <= 0:
            continue
        pct = spent / amount * 100
        cat = cats.get(b.category_id)
        name = cat.name if cat else "Categoria"
        if pct >= 100:
            insights.append(Insight(
                kind="budget", severity="critical",
                title=f"Orçamento de {name} estourado",
                detail=f"{_brl(spent)} de {_brl(amount)} ({pct:.0f}%). Excesso de {_brl(spent - amount)}.",
                amount=round(spent - amount, 2),
                category_icon=cat.icon if cat else None,
            ))
        elif pct >= 80:
            insights.append(Insight(
                kind="budget", severity="warning",
                title=f"{name} em {pct:.0f}% do orçamento",
                detail=f"{_brl(spent)} de {_brl(amount)}. Restam {_brl(amount - spent)} no mês.",
                amount=round(amount - spent, 2),
                category_icon=cat.icon if cat else None,
            ))

    # 4. Aumento de preço em assinaturas
    for s in detect_series(db, today):
        if s.price_increased and s.active:
            yearly = s.price_change * (12 if s.cadence == "monthly" else 1)
            insights.append(Insight(
                kind="price_increase", severity="warning",
                title=f"{s.description} subiu de preço",
                detail=f"De {_brl(s.expected_amount)} para {_brl(s.last_amount)} (+{_brl(s.price_change)}). Custo extra de ~{_brl(yearly)}/ano.",
                amount=s.price_change,
                category_icon=s.category_icon,
            ))

    # 5. Cobrança duplicada (mesmo descritor + valor em <=48h)
    month_txs = (
        db.query(Transaction)
        .filter(
            Transaction.type == "expense",
            Transaction.is_transfer.is_(False),
            extract("month", Transaction.date) == m,
            extract("year", Transaction.date) == y,
        )
        .order_by(Transaction.date.asc())
        .all()
    )
    seen: dict[tuple[str, float], date] = {}
    flagged: set[tuple[str, float]] = set()
    for tx in month_txs:
        key = (normalize_description(tx.description), round(float(tx.amount), 2))
        if key in seen and (tx.date - seen[key]).days <= 2 and key not in flagged and float(tx.amount) >= 20:
            flagged.add(key)
            insights.append(Insight(
                kind="duplicate", severity="critical",
                title=f"Possível cobrança dupla: {tx.description}",
                detail=f"Duas cobranças de {_brl(float(tx.amount))} em até 48h. Vale conferir no extrato.",
                amount=float(tx.amount),
            ))
        seen[key] = tx.date

    # 6. Gasto atípico (z-score > 3 dentro da categoria, mínimo R$ 200)
    if month_txs:
        hist_by_cat: dict[Optional[int], list[float]] = {}
        cutoff = date(y, m, 1)
        for tx in (
            db.query(Transaction)
            .filter(
                Transaction.type == "expense",
                Transaction.is_transfer.is_(False),
                Transaction.date < cutoff,
                Transaction.date >= cutoff - timedelta(days=365),
            )
            .all()
        ):
            hist_by_cat.setdefault(tx.category_id, []).append(float(tx.amount))
        biggest = max(month_txs, key=lambda t: float(t.amount))
        hist = hist_by_cat.get(biggest.category_id, [])
        if len(hist) >= 8 and float(biggest.amount) >= 200:
            mu, sigma = mean(hist), max(pstdev(hist), mean(hist) * 0.1, 1.0)
            z = (float(biggest.amount) - mu) / sigma
            if z > 3:
                cat = cats.get(biggest.category_id)
                insights.append(Insight(
                    kind="big_expense", severity="info",
                    title=f"Gasto fora do padrão: {biggest.description}",
                    detail=f"{_brl(float(biggest.amount))} em {cat.name if cat else 'Sem categoria'} — bem acima do típico ({_brl(mu)}).",
                    amount=float(biggest.amount),
                    category_icon=cat.icon if cat else None,
                ))

    # 7. Taxa de poupança do mês (só informa quando é notável)
    income_now = _month_total(db, m, y, "income")
    if income_now > 0:
        rate = (income_now - expense_now) / income_now * 100
        if rate >= 20:
            insights.append(Insight(
                kind="savings", severity="positive",
                title=f"Vocês pouparam {rate:.0f}% da renda",
                detail=f"Sobra de {_brl(income_now - expense_now)} até agora neste mês. Ótimo ritmo.",
                amount=round(income_now - expense_now, 2),
            ))
        elif rate < 0:
            insights.append(Insight(
                kind="savings", severity="critical",
                title="Mês no vermelho",
                detail=f"As despesas superam as receitas em {_brl(expense_now - income_now)} até agora.",
                amount=round(income_now - expense_now, 2),
            ))

    # 8. Casal: mês anterior com acerto pendente
    prev_settled = (
        db.query(Settlement).filter(Settlement.month == pm, Settlement.year == py).first()
    )
    if not prev_settled:
        prev_shared = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.type == "expense",
                Transaction.is_transfer.is_(False),
                Transaction.is_shared.is_(True),
                extract("month", Transaction.date) == pm,
                extract("year", Transaction.date) == py,
            )
            .scalar()
        )
        if float(prev_shared) > 0:
            insights.append(Insight(
                kind="couple", severity="info",
                title="Acerto do mês passado pendente",
                detail=f"O casal teve {_brl(float(prev_shared))} em despesas compartilhadas em {pm:02d}/{py} e o acerto ainda não foi registrado.",
                amount=float(prev_shared),
            ))

    severity_order = {"critical": 0, "warning": 1, "info": 2, "positive": 3}
    insights.sort(key=lambda i: (severity_order.get(i.severity, 9), -(abs(i.amount or 0))))
    return insights


@router.get("/forecast", response_model=Forecast)
def forecast(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    today = date.today()
    m, y = month or today.month, year or today.year
    days_in_month = monthrange(y, m)[1]
    is_current = (m, y) == (today.month, today.year)
    days_elapsed = today.day if is_current else days_in_month
    days_remaining = max(0, days_in_month - days_elapsed)

    month_txs = (
        db.query(Transaction)
        .filter(
            Transaction.is_transfer.is_(False),
            extract("month", Transaction.date) == m,
            extract("year", Transaction.date) == y,
        )
        .all()
    )
    spent = sum(float(t.amount) for t in month_txs if t.type == "expense")
    income = sum(float(t.amount) for t in month_txs if t.type == "income")

    series_detected = detect_series(db, today)
    recurring = {(s.key, s.type): s for s in series_detected}
    posted_keys = {(normalize_description(t.description), t.type) for t in month_txs}

    # Recorrências mensais ativas ainda não lançadas neste mês
    committed = 0.0
    pending_income = 0.0
    if days_remaining > 0:
        for (key, tx_type), s in recurring.items():
            if s.cadence != "monthly" or not s.active or (key, tx_type) in posted_keys:
                continue
            if tx_type == "expense":
                committed += s.expected_amount
            else:
                pending_income += s.expected_amount

    # Gasto variável médio/dia: últimos 90 dias, excluindo séries recorrentes
    window_start = today - timedelta(days=90)
    variable_total = 0.0
    for tx in (
        db.query(Transaction)
        .filter(
            Transaction.type == "expense",
            Transaction.is_transfer.is_(False),
            Transaction.date >= window_start,
            Transaction.date <= today,
        )
        .all()
    ):
        if (normalize_description(tx.description), "expense") not in recurring:
            variable_total += float(tx.amount)
    daily_rate = round(variable_total / 90, 2)

    projected_expense = spent + committed + (daily_rate * days_remaining if is_current else 0)
    projected_income = income + (pending_income if is_current else 0)
    projected_balance = projected_income - projected_expense
    safe_total = max(0.0, projected_income - spent - committed)
    safe_daily = round(safe_total / days_remaining, 2) if days_remaining > 0 else 0.0

    # Série diária: acumulado real até hoje + projeção depois
    expense_by_day: dict[int, float] = {}
    for tx in month_txs:
        if tx.type == "expense":
            expense_by_day[tx.date.day] = expense_by_day.get(tx.date.day, 0.0) + float(tx.amount)

    series: list[ForecastDay] = []
    cumulative = 0.0
    committed_per_day = committed / days_remaining if days_remaining > 0 else 0.0
    for d in range(1, days_in_month + 1):
        if d <= days_elapsed:
            cumulative += expense_by_day.get(d, 0.0)
            point = ForecastDay(day=d, actual=round(cumulative, 2))
            if d == days_elapsed and is_current and days_remaining > 0:
                point.projected = round(cumulative, 2)  # emenda da linha projetada
            series.append(point)
        else:
            cumulative += daily_rate + committed_per_day
            series.append(ForecastDay(day=d, projected=round(cumulative, 2)))

    return Forecast(
        month=m, year=y,
        is_current_month=is_current,
        days_elapsed=days_elapsed,
        days_remaining=days_remaining,
        spent_so_far=round(spent, 2),
        income_so_far=round(income, 2),
        committed_remaining=round(committed, 2),
        variable_daily_rate=daily_rate,
        projected_expense=round(projected_expense, 2),
        projected_income=round(projected_income, 2),
        projected_balance=round(projected_balance, 2),
        safe_to_spend_total=round(safe_total, 2),
        safe_to_spend_daily=safe_daily,
        series=series,
    )


@router.get("/spending-analysis", response_model=SpendingAnalysis)
def spending_analysis(
    months: int = Query(6, ge=3, le=24),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Histórico de gastos, médias e pontos de atenção para a página Análise."""
    today = date.today()

    # Eixo de meses (do mais antigo ao atual)
    axis: list[tuple[int, int]] = []
    m, y = today.month, today.year
    for _i in range(months):
        axis.append((m, y))
        m, y = _prev_month(m, y)
    axis.reverse()
    axis_labels = [f"{ay:04d}-{am:02d}" for am, ay in axis]

    first_month, first_year = axis[0]
    window_start = date(first_year, first_month, 1)
    txs = (
        db.query(Transaction)
        .filter(
            Transaction.is_transfer.is_(False),
            Transaction.date >= window_start,
            Transaction.date <= today,
        )
        .all()
    )

    monthly_expense: dict[str, float] = {label: 0.0 for label in axis_labels}
    monthly_income: dict[str, float] = {label: 0.0 for label in axis_labels}
    by_cat_month: dict[Optional[int], dict[str, float]] = {}
    for tx in txs:
        label = f"{tx.date.year:04d}-{tx.date.month:02d}"
        if label not in monthly_expense:
            continue
        if tx.type == "expense":
            monthly_expense[label] += float(tx.amount)
            by_cat_month.setdefault(tx.category_id, {label2: 0.0 for label2 in axis_labels})
            by_cat_month[tx.category_id][label] += float(tx.amount)
        else:
            monthly_income[label] += float(tx.amount)

    monthly = [
        MonthPoint(month=label, expense=round(monthly_expense[label], 2), income=round(monthly_income[label], 2))
        for label in axis_labels
    ]

    # Médias sobre meses fechados (o mês corrente parcial distorceria)
    closed = monthly[:-1] if len(monthly) > 1 else monthly
    closed_with_data = [p for p in closed if p.expense > 0 or p.income > 0]
    avg_expense = mean([p.expense for p in closed_with_data]) if closed_with_data else 0.0
    avg_daily = avg_expense / 30 if avg_expense else 0.0
    highest = max(closed_with_data, key=lambda p: p.expense, default=None)
    lowest = min([p for p in closed_with_data if p.expense > 0], key=lambda p: p.expense, default=None)

    # Tendência por categoria (top por gasto no período)
    cats = {c.id: c for c in db.query(Category).all()}
    current_label = axis_labels[-1]
    total_period = sum(sum(series.values()) for series in by_cat_month.values())

    trends: list[CategoryTrend] = []
    for cat_id, series in by_cat_month.items():
        cat = cats.get(cat_id)
        closed_values = [series[label] for label in axis_labels[:-1]]
        closed_nonzero = [v for v in closed_values if v > 0]
        avg_cat = mean(closed_nonzero) if closed_nonzero else 0.0
        current = series[current_label]
        total_cat = sum(series.values())
        trends.append(CategoryTrend(
            category_id=cat_id,
            category_name=cat.name if cat else "Sem categoria",
            category_icon=cat.icon if cat else "📌",
            category_color=cat.color if cat else "#8B8B94",
            avg_monthly=round(avg_cat, 2),
            current_month=round(current, 2),
            share_pct=round(total_cat / total_period * 100, 1) if total_period > 0 else 0.0,
            delta_pct_vs_avg=round((current - avg_cat) / avg_cat * 100, 1) if avg_cat > 0 else 0.0,
            series=[round(series[label], 2) for label in axis_labels],
        ))
    trends.sort(key=lambda t: sum(t.series), reverse=True)

    # Pontos de atenção
    concerns: list[ConcernItem] = []
    for t in trends:
        if t.avg_monthly > 0 and t.current_month > t.avg_monthly * 1.25 and (t.current_month - t.avg_monthly) >= 100:
            concerns.append(ConcernItem(
                kind="category_above_avg",
                title=f"{t.category_name} {t.delta_pct_vs_avg:+.0f}% vs média",
                detail=f"{_brl(t.current_month)} neste mês contra uma média de {_brl(t.avg_monthly)} nos meses anteriores.",
                amount=round(t.current_month - t.avg_monthly, 2),
                category_icon=t.category_icon,
            ))

    budgets = {b.category_id: float(b.amount) for b in db.query(Budget).all()}
    for t in trends:
        limit = budgets.get(t.category_id)
        if limit and t.current_month > limit:
            concerns.append(ConcernItem(
                kind="over_budget",
                title=f"{t.category_name} acima do orçamento",
                detail=f"{_brl(t.current_month)} gastos com limite de {_brl(limit)}.",
                amount=round(t.current_month - limit, 2),
                category_icon=t.category_icon,
            ))

    # Concentração: uma categoria dominando o gasto do período
    if trends and total_period > 0 and trends[0].share_pct >= 40 and trends[0].category_name != "Sem categoria":
        t = trends[0]
        concerns.append(ConcernItem(
            kind="concentration",
            title=f"{t.category_name} concentra {t.share_pct:.0f}% dos gastos",
            detail=f"Quase metade do gasto do período está em uma única categoria — vale conferir se é o esperado.",
            amount=round(sum(t.series), 2),
            category_icon=t.category_icon,
        ))

    concerns.sort(key=lambda c: -c.amount)

    return SpendingAnalysis(
        months_axis=axis_labels,
        monthly=monthly,
        avg_expense=round(avg_expense, 2),
        avg_daily_expense=round(avg_daily, 2),
        highest_month=highest,
        lowest_month=lowest,
        categories=trends[:8],
        concerns=concerns[:8],
    )


@router.get("/subscriptions", response_model=SubscriptionsResponse)
def subscriptions(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    series = [s for s in detect_series(db) if s.type == "expense"]
    active = [s for s in series if s.active]
    return SubscriptionsResponse(
        total_monthly=round(sum(s.monthly_cost for s in active), 2),
        active_count=len(active),
        items=[SubscriptionItem(
            description=s.description,
            cadence=s.cadence,
            expected_amount=s.expected_amount,
            last_amount=s.last_amount,
            last_date=s.last_date,
            expected_day=s.expected_day,
            occurrences=s.occurrences,
            monthly_cost=s.monthly_cost,
            price_increased=s.price_increased,
            price_change=s.price_change,
            active=s.active,
            category_name=s.category_name,
            category_icon=s.category_icon,
        ) for s in series],
    )
