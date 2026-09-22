"""Plano financeiro de longo prazo do casal — espaço compartilhado autenticado."""
import datetime as dt
from datetime import date
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.models.plan_event import PlanEvent
from app.models.plan_settings import PlanSettings
from app.models.purchase_goal import PurchaseGoal
from app.models.transaction import Transaction
from app.models.user import User
from app.services.planning import observed_capacity, simulate, add_months

router = APIRouter(prefix="/plan", tags=["plan"])


class SettingsBody(BaseModel):
    inflation_rate: float = Field(default=4, ge=0, le=30)
    annual_return_rate: float = Field(default=0, ge=-30, le=50)
    history_months: int = Field(default=6, ge=3, le=24)


class SettingsUpdate(BaseModel):
    inflation_rate: float | None = Field(default=None, ge=0, le=30)
    annual_return_rate: float | None = Field(default=None, ge=-30, le=50)
    history_months: int | None = Field(default=None, ge=3, le=24)


class EventCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    date: date
    end_date: date | None = None
    kind: Literal["income", "expense"]
    amount: float = Field(gt=0)
    recurrence: Literal["once", "monthly"] = "once"
    notes: str | None = None


class EventUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    date: dt.date | None = None
    end_date: dt.date | None = None
    kind: Literal["income", "expense"] | None = None
    amount: float | None = Field(default=None, gt=0)
    recurrence: Literal["once", "monthly"] | None = None
    notes: str | None = None


class EventResponse(EventCreate):
    id: int
    model_config = {"from_attributes": True}


def _settings(db: Session) -> PlanSettings:
    """Linha única de premissas do plano compartilhado do casal."""
    item = db.get(PlanSettings, 1)
    if item is None:
        item = PlanSettings(id=1, inflation_rate=4, annual_return_rate=0, history_months=6)
        db.add(item)
        db.commit()
        db.refresh(item)
    return item


def _validate_event_dates(start: date, end: date | None, recurrence: str) -> None:
    if end is not None and end < start:
        raise HTTPException(422, "Data final não pode ser anterior à data inicial")


@router.get("/settings", response_model=SettingsBody)
def get_plan_settings(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _settings(db)


@router.put("/settings", response_model=SettingsBody)
def update_plan_settings(body: SettingsUpdate, db: Session = Depends(get_db),
                         user: User = Depends(get_current_user)):
    item = _settings(db)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.get("/events", response_model=list[EventResponse])
def list_events(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(PlanEvent).order_by(PlanEvent.date, PlanEvent.id).all()


@router.post("/events", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(body: EventCreate, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    _validate_event_dates(body.date, body.end_date, body.recurrence)
    item = PlanEvent(**body.model_dump(), user_id=user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def _shared_event(db: Session, event_id: int) -> PlanEvent:
    item = db.get(PlanEvent, event_id)
    if item is None:
        raise HTTPException(404, "Evento não encontrado")
    return item


@router.put("/events/{event_id}", response_model=EventResponse)
def update_event(event_id: int, body: EventUpdate, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    item = _shared_event(db, event_id)
    changes = body.model_dump(exclude_unset=True)
    new_start = changes.get("date", item.date)
    new_end = changes.get("end_date", item.end_date)
    new_recurrence = changes.get("recurrence", item.recurrence)
    _validate_event_dates(new_start, new_end, new_recurrence)
    for key, value in changes.items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: int, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    db.delete(_shared_event(db, event_id))
    db.commit()


def _projection(db: Session, today: date) -> dict:
    settings = _settings(db)
    first_closed = add_months(today.replace(day=1), -settings.history_months)
    # Espaço compartilhado do casal: evidência cobre os lançamentos dos dois.
    transactions = db.query(Transaction).filter(
        Transaction.date >= first_closed, Transaction.date < today.replace(day=1),
        Transaction.is_transfer.is_(False),
    ).all()
    rows = {}
    for offset in range(settings.history_months):
        month = add_months(first_closed, offset).strftime("%Y-%m")
        rows[month] = dict(month=month, income=0.0, expense=0.0,
                           has_income=False, has_expense=False)
    for tx in transactions:
        row = rows[tx.date.strftime("%Y-%m")]
        if tx.type in ("income", "expense"):
            row[tx.type] += float(tx.amount)
            row["has_" + tx.type] = True
    evidence = observed_capacity(list(rows.values()))
    goals = db.query(PurchaseGoal).order_by(PurchaseGoal.id).all()
    goal_data = [dict(id=g.id, name=g.name, target_date=g.target_date,
                      target_amount=float(g.target_amount), saved_amount=float(g.saved_amount),
                      saved_amount_source=g.saved_amount_source,
                      monthly_contribution=float(g.monthly_contribution),
                      priority=g.priority, is_completed=g.is_completed) for g in goals]
    events = [dict(date=e.date, end_date=e.end_date, kind=e.kind, amount=float(e.amount),
                   recurrence=e.recurrence) for e in db.query(PlanEvent).all()]
    capacity = evidence["monthly_capacity"]
    base = simulate(goal_data, events, today, capacity,
                    float(settings.inflation_rate), float(settings.annual_return_rate))
    scenario_rates = [("conservative", max(-30, float(settings.annual_return_rate)-3)),
                      ("base", float(settings.annual_return_rate)),
                      ("optimistic", min(50, float(settings.annual_return_rate)+3))]
    scenarios = []
    for key, rate in scenario_rates:
        result = base if key == "base" else simulate(goal_data, events, today, capacity,
                                    float(settings.inflation_rate), rate)
        scenarios.append(dict(key=key, annual_return_rate=rate,
                              goals=[dict(goal_id=g["id"], projected_amount=g["projected_amount"],
                                          gap=g["gap"]) for g in result["goals"]]))
    requested = round(sum(g["monthly_contribution"] for g in goal_data if not g["is_completed"]),2)
    available = max(0, capacity) if capacity is not None else None
    warnings = ["Projeções são simulações baseadas em premissas; retorno não é garantido."]
    if capacity is None:
        warnings.append("São necessários ao menos 3 meses fechados com receitas e despesas para estimar a capacidade.")
    if capacity is not None and capacity < 0:
        warnings.append("A média dos meses fechados indica déficit; nenhum aporte foi presumido.")
    if available is not None and requested > available:
        warnings.append("A soma dos aportes planejados supera a capacidade mensal observada; a simulação prioriza metas de prioridade alta.")
    if any(g["saved_amount_source"] == "manual" for g in goal_data):
        warnings.append("Valores já guardados informados manualmente não foram conciliados com saldos bancários.")
    return dict(as_of=today.isoformat(), evidence=evidence,
                assumptions=dict(inflation_rate=float(settings.inflation_rate),
                                 annual_return_rate=float(settings.annual_return_rate),
                                 history_months=settings.history_months,
                                 return_is_guaranteed=False),
                allocation=dict(requested_monthly=requested, available_monthly=available,
                                unallocated_monthly=round(max(0,available-requested),2) if available is not None else None,
                                shortfall_monthly=round(max(0,requested-available),2) if available is not None else None),
                goals=base["goals"], monthly=base["monthly"],
                scenarios=scenarios, warnings=warnings)


@router.get("/projection")
def projection(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _projection(db, date.today())


@router.get("/insights")
def goal_insights(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    projection = _projection(db, date.today())
    evidence = projection["evidence"]
    if evidence["monthly_capacity"] is None:
        return []
    insights = []
    for goal in projection["goals"]:
        if goal["status"] not in ("at_risk", "overdue"):
            continue
        gap = abs(goal["gap"]) if goal["gap"] is not None else None
        insights.append(dict(goal_id=goal["id"],
            fact=f"Capacidade observada: R$ {evidence['monthly_capacity']:.2f}/mês em {evidence['closed_months']} meses fechados.",
            impact=f"A meta {goal['name']} tem diferença projetada de R$ {gap:.2f}." if gap is not None else f"A meta {goal['name']} venceu.",
            action="Revise o aporte, o prazo ou o valor da meta e compare os cenários.",
            assumptions=projection["assumptions"],
            evidence_period=dict(start=evidence["period_start"], end=evidence["period_end"])))
    return insights
