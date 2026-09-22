"""Deterministic planning calculations. All rates are editable assumptions, not promises."""
from calendar import monthrange
from datetime import date
from statistics import mean


def add_months(day: date, months: int) -> date:
    month_index = (day.year * 12 + day.month - 1) + months
    year, month = divmod(month_index, 12)
    month += 1
    return date(year, month, min(day.day, monthrange(year, month)[1]))


def observed_capacity(months: list[dict]) -> dict:
    """Use only closed months containing both income and expense entries."""
    eligible = [m for m in months if m["has_income"] and m["has_expense"]]
    if len(eligible) < 3:
        return dict(period_start=None, period_end=None, closed_months=len(eligible),
                    monthly_income=None, monthly_expense=None, monthly_capacity=None)
    incomes = [m["income"] for m in eligible]
    expenses = [m["expense"] for m in eligible]
    return dict(period_start=eligible[0]["month"], period_end=eligible[-1]["month"],
                closed_months=len(eligible), monthly_income=round(mean(incomes), 2),
                monthly_expense=round(mean(expenses), 2),
                monthly_capacity=round(mean(incomes) - mean(expenses), 2))


def _event_effect(events: list[dict], month: date) -> float:
    result = 0.0
    for event in events:
        start = event["date"]
        end = event.get("end_date")
        applies = (start.year, start.month) == (month.year, month.month)
        if event["recurrence"] == "monthly":
            applies = (start.year, start.month) <= (month.year, month.month)
            if end is not None:
                applies = applies and (month.year, month.month) <= (end.year, end.month)
        if applies:
            result += event["amount"] * (1 if event["kind"] == "income" else -1)
    return result


def simulate(goals: list[dict], events: list[dict], as_of: date,
             capacity: float | None, inflation_rate: float,
             annual_return_rate: float, months: int = 120) -> dict:
    """Allocate monthly contributions by priority without spending capacity twice.

    Balances compound monthly at the user supplied nominal rate. Target purchasing
    power grows with inflation from today to its due month. Recurring events change
    monthly capacity; one-time events change it only in their calendar month.
    """
    balances = {g["id"]: float(g["saved_amount"]) for g in goals}
    due = {}
    for g in goals:
        due[g["id"]] = max(0, min(months, (g["target_date"].year-as_of.year)*12
            + g["target_date"].month-as_of.month)) if g["target_date"] else months
    monthly = []
    snapshots = {gid: round(balances[gid], 2) for gid, step in due.items() if step == 0}
    rate = (1 + annual_return_rate / 100) ** (1 / 12) - 1
    sorted_goals = sorted(goals, key=lambda g: ({"alta": 0, "media": 1, "baixa": 2}.get(g["priority"], 1), g["target_date"] or date.max, g["id"]))
    for step in range(1, months + 1):
        month = add_months(as_of.replace(day=1), step)
        available = max(0.0, capacity + _event_effect(events, month)) if capacity is not None else None
        remaining = available
        allocated = 0.0
        if capacity is not None:
            for g in sorted_goals:
                gid = g["id"]
                balances[gid] *= 1 + rate
                if step <= due[gid] and not g["is_completed"]:
                    contribution = min(max(0.0, float(g["monthly_contribution"])), remaining)
                    balances[gid] += contribution
                    remaining -= contribution
                    allocated += contribution
        if capacity is not None:
            for gid, target_step in due.items():
                if step == target_step:
                    snapshots[gid] = round(balances[gid], 2)
        deflate = (1 + inflation_rate / 100) ** (step / 12)
        monthly.append(dict(month=month.strftime("%Y-%m"), capacity=round(available,2) if available is not None else None,
                            allocated=round(allocated,2) if available is not None else None,
                            unallocated=round(remaining,2) if remaining is not None else None,
                            goal_total=round(sum(balances.values()),2) if capacity is not None else None,
                            goal_total_real=round(sum(balances.values()) / deflate, 2) if capacity is not None else None))
    results = []
    for g in goals:
        gid = g["id"]
        target = round(float(g["target_amount"]) * (1 + inflation_rate / 100) ** (due[gid] / 12), 2)
        projected = snapshots.get(gid) if capacity is not None else None
        projected_real = round(projected / (1 + inflation_rate / 100) ** (due[gid] / 12), 2) if projected is not None else None
        if g["is_completed"]:
            status = "completed"
        elif g["target_date"] and g["target_date"] < as_of:
            status = "overdue"
        elif projected is None or (g["target_date"] and g["target_date"] > add_months(as_of, months)):
            status = "insufficient_data"
        else:
            status = "on_track" if projected >= target else "at_risk"
        results.append(dict(id=gid, name=g["name"],
                            target_date=g["target_date"].isoformat() if g["target_date"] else None,
                            target_amount=round(float(g["target_amount"]),2),
                            saved_amount=round(float(g["saved_amount"]),2),
                            saved_amount_source=g["saved_amount_source"],
                            monthly_contribution=round(float(g["monthly_contribution"]),2),
                            projected_amount=projected, projected_amount_real=projected_real, projected_target=target,
                            gap=round(projected-target,2) if projected is not None else None,
                            status=status))
    return dict(monthly=monthly, goals=results)
