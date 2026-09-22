"""Testes do motor determinístico de planejamento (services/planning.py)."""
from datetime import date

from app.services.planning import _event_effect, add_months, observed_capacity, simulate


def _goal(id=1, name="Meta", target_amount=10000.0, saved=0.0, aporte=500.0,
          priority="media", target_date=date(2030, 1, 1), completed=False):
    return dict(id=id, name=name, target_date=target_date, target_amount=target_amount,
                saved_amount=saved, saved_amount_source="manual",
                monthly_contribution=aporte, priority=priority, is_completed=completed)


# ─── add_months ──────────────────────────────────────────────────────────────

def test_add_months_clamps_day_to_month_length():
    assert add_months(date(2026, 1, 31), -1) == date(2025, 12, 31)
    assert add_months(date(2026, 3, 31), -1) == date(2026, 2, 28)
    assert add_months(date(2024, 3, 31), -1) == date(2024, 2, 29)


# ─── observed_capacity ───────────────────────────────────────────────────────

def test_capacity_requires_three_eligible_months():
    months = [
        dict(month="2026-06", income=5000.0, expense=3000.0, has_income=True, has_expense=True),
        dict(month="2026-07", income=5000.0, expense=3000.0, has_income=True, has_expense=True),
        dict(month="2026-08", income=0.0, expense=3000.0, has_income=False, has_expense=True),
    ]
    ev = observed_capacity(months)
    assert ev["monthly_capacity"] is None
    assert ev["closed_months"] == 2


def test_capacity_ignores_months_without_income_and_averages():
    months = [
        dict(month="2026-05", income=10000.0, expense=6000.0, has_income=True, has_expense=True),
        dict(month="2026-06", income=8000.0, expense=6000.0, has_income=True, has_expense=True),
        dict(month="2026-07", income=0.0, expense=9000.0, has_income=False, has_expense=True),
        dict(month="2026-08", income=12000.0, expense=6000.0, has_income=True, has_expense=True),
    ]
    ev = observed_capacity(months)
    assert ev["closed_months"] == 3
    assert ev["monthly_income"] == 10000.0
    assert ev["monthly_expense"] == 6000.0
    assert ev["monthly_capacity"] == 4000.0
    assert ev["period_start"] == "2026-05" and ev["period_end"] == "2026-08"


# ─── simulate ────────────────────────────────────────────────────────────────

def test_simulate_without_capacity_yields_no_projection():
    res = simulate([_goal()], [], date(2026, 9, 22), None, 4.0, 6.0)
    assert res["goals"][0]["status"] == "insufficient_data"
    assert res["goals"][0]["projected_amount"] is None
    assert all(m["goal_total"] is None for m in res["monthly"])
    assert len(res["monthly"]) == 120


def test_simulate_never_allocates_more_than_capacity():
    goals = [_goal(id=1, aporte=2000.0, priority="alta"),
             _goal(id=2, name="B", aporte=2000.0, priority="baixa", target_date=date(2031, 1, 1))]
    res = simulate(goals, [], date(2026, 9, 22), 1500.0, 0.0, 0.0)
    for m in res["monthly"]:
        assert m["allocated"] <= m["capacity"]
        assert m["allocated"] <= 1500.0


def test_high_priority_goal_is_funded_first():
    goals = [_goal(id=1, aporte=1000.0, priority="alta", saved=0.0, target_amount=100000.0),
             _goal(id=2, name="B", aporte=1000.0, priority="baixa", saved=0.0,
                   target_amount=100000.0, target_date=date(2031, 1, 1))]
    res = simulate(goals, [], date(2026, 9, 22), 1200.0, 0.0, 0.0)
    alta = next(g for g in res["goals"] if g["id"] == 1)
    baixa = next(g for g in res["goals"] if g["id"] == 2)
    # alta recebe 1000/mês integral; baixa fica só com os 200 que sobram
    assert alta["projected_amount"] > baixa["projected_amount"]
    assert res["monthly"][0]["allocated"] == 1200.0


def test_overdue_goal_reports_saved_amount_not_projection():
    res = simulate([_goal(target_date=date(2020, 1, 1), saved=3000.0)],
                   [], date(2026, 9, 22), 1000.0, 4.0, 0.0)
    goal = res["goals"][0]
    assert goal["status"] == "overdue"
    assert goal["projected_amount"] == 3000.0
    assert goal["projected_target"] == 10000.0


def test_completed_goal_keeps_status_completed():
    res = simulate([_goal(completed=True)], [], date(2026, 9, 22), 1000.0, 4.0, 0.0)
    assert res["goals"][0]["status"] == "completed"


def test_inflation_raises_target_purchasing_price():
    res = simulate([_goal(target_amount=10000.0, target_date=date(2031, 9, 1))],
                   [], date(2026, 9, 22), 1000.0, 12.0, 0.0)
    assert res["goals"][0]["projected_target"] > 10000.0


def test_goal_without_due_date_projects_to_horizon():
    res = simulate([_goal(target_date=None, saved=1000.0, aporte=100.0)],
                   [], date(2026, 9, 22), 500.0, 0.0, 0.0)
    goal = res["goals"][0]
    # 120 aportes de 100 sobre 1000 iniciais, sem retorno
    assert goal["projected_amount"] == 1000.0 + 120 * 100.0


# ─── eventos futuros ─────────────────────────────────────────────────────────

def test_monthly_event_changes_capacity_from_start_to_end():
    events = [dict(date=date(2027, 1, 1), end_date=date(2027, 6, 15),
                   kind="income", amount=800.0, recurrence="monthly")]
    assert _event_effect(events, date(2026, 12, 1)) == 0.0
    assert _event_effect(events, date(2027, 1, 1)) == 800.0
    assert _event_effect(events, date(2027, 6, 1)) == 800.0
    assert _event_effect(events, date(2027, 7, 1)) == 0.0


def test_once_event_applies_only_in_its_month():
    events = [dict(date=date(2027, 3, 10), end_date=None, kind="expense",
                   amount=500.0, recurrence="once")]
    assert _event_effect(events, date(2027, 3, 1)) == -500.0
    assert _event_effect(events, date(2027, 4, 1)) == 0.0


def test_expense_event_reduces_allocatable_capacity():
    goals = [_goal(aporte=500.0)]
    events = [dict(date=date(2026, 10, 1), end_date=None, kind="expense",
                   amount=300.0, recurrence="monthly")]
    res = simulate(goals, events, date(2026, 9, 22), 1000.0, 0.0, 0.0)
    assert res["monthly"][0]["capacity"] == 700.0
    assert res["monthly"][0]["allocated"] == 500.0


# ─── valores nominais e reais ────────────────────────────────────────────────

def test_real_values_are_deflated_by_inflation():
    res = simulate([_goal(saved=1000.0, aporte=0.0)], [], date(2026, 9, 22),
                   500.0, inflation_rate=12.0, annual_return_rate=0.0)
    first = res["monthly"][0]
    last = res["monthly"][11]
    assert first["goal_total_real"] < first["goal_total"]
    assert last["goal_total_real"] < first["goal_total_real"]
    goal = res["goals"][0]
    assert goal["projected_amount_real"] < goal["projected_amount"]


def test_no_projection_is_presented_as_guaranteed():
    # sem histórico, nada é projetado — contrato central do plano
    res = simulate([_goal()], [], date(2026, 9, 22), None, 4.0, 6.0)
    assert res["goals"][0]["gap"] is None
    assert res["goals"][0]["projected_amount"] is None
