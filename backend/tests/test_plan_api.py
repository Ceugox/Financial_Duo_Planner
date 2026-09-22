"""Testes dos endpoints /plan — espaço compartilhado do casal."""
from datetime import date, timedelta

from app.dependencies import get_current_user
from app.main import app
from app.models.plan_event import PlanEvent
from app.models.purchase_goal import PurchaseGoal
from app.models.transaction import Transaction


def _tx(db, user_id, tipo, amount, when):
    db.add(Transaction(type=tipo, amount=amount, description=f"{tipo} {amount}",
                       date=when, is_transfer=False, user_id=user_id))


def _seed_closed_months(db, user_id, partner_id, months=5):
    """Semeia meses fechados para os DOIS usuários — evidência compartilhada."""
    first = date.today().replace(day=1)
    for i in range(1, months + 1):
        month = (first - timedelta(days=28 * i)).replace(day=15)
        _tx(db, user_id, "income", 4000, month)
        _tx(db, user_id, "expense", 2000, month)
        _tx(db, partner_id, "income", 6000, month)
        _tx(db, partner_id, "expense", 3000, month)
    db.commit()


# ─── settings (linha única do casal) ─────────────────────────────────────────

def test_settings_defaults_then_update(client):
    r = client.get("/api/v1/plan/settings")
    assert r.status_code == 200
    assert r.json() == {"inflation_rate": 4, "annual_return_rate": 0, "history_months": 6}

    r = client.put("/api/v1/plan/settings", json={"annual_return_rate": 8.5})
    assert r.status_code == 200
    assert r.json()["annual_return_rate"] == 8.5
    assert client.get("/api/v1/plan/settings").json()["annual_return_rate"] == 8.5


def test_settings_rejects_out_of_bounds(client):
    assert client.put("/api/v1/plan/settings", json={"inflation_rate": 99}).status_code == 422
    assert client.put("/api/v1/plan/settings", json={"history_months": 2}).status_code == 422


# ─── eventos (CRUD compartilhado) ────────────────────────────────────────────

def test_events_crud_and_validation(client):
    payload = dict(name="Promoção", date="2027-01-01", end_date=None, kind="income",
                   amount=1500.0, recurrence="monthly", notes=None)
    r = client.post("/api/v1/plan/events", json=payload)
    assert r.status_code == 201
    event_id = r.json()["id"]

    assert client.get("/api/v1/plan/events").json()[0]["name"] == "Promoção"

    r = client.put(f"/api/v1/plan/events/{event_id}", json={"amount": 2000.0, "end_date": "2028-01-01"})
    assert r.status_code == 200
    assert r.json()["amount"] == 2000.0 and r.json()["end_date"] == "2028-01-01"

    assert client.delete(f"/api/v1/plan/events/{event_id}").status_code == 204
    assert client.get("/api/v1/plan/events").json() == []


def test_event_end_date_before_start_is_rejected(client):
    payload = dict(name="Errado", date="2027-06-01", end_date="2027-01-01",
                   kind="expense", amount=100.0, recurrence="monthly")
    assert client.post("/api/v1/plan/events", json=payload).status_code == 422


def test_events_are_shared_between_partners(client, partner):
    client.post("/api/v1/plan/events", json=dict(
        name="Renda Bia", date="2027-01-01", end_date=None, kind="income",
        amount=900.0, recurrence="monthly"))

    # troca o usuário autenticado para a parceira — o plano é do casal
    app.dependency_overrides[get_current_user] = lambda: partner
    events = client.get("/api/v1/plan/events").json()
    assert len(events) == 1 and events[0]["name"] == "Renda Bia"
    assert client.delete(f"/api/v1/plan/events/{events[0]['id']}").status_code == 204


def test_goals_are_shared_between_partners(client, partner):
    """Meta criada por um é listada, editável e removível pelo parceiro."""
    r = client.post("/api/v1/purchase-goals", json=dict(
        name="Reserva do casal", target_amount=10000.0, saved_amount=1000.0,
        monthly_contribution=500.0))
    assert r.status_code == 201
    goal_id = r.json()["id"]

    app.dependency_overrides[get_current_user] = lambda: partner
    goals = client.get("/api/v1/purchase-goals").json()
    assert [g["name"] for g in goals] == ["Reserva do casal"]

    r = client.patch(f"/api/v1/purchase-goals/{goal_id}/deposit", json={"amount": 500.0})
    assert r.status_code == 200 and r.json()["saved_amount"] == 1500.0

    assert client.delete(f"/api/v1/purchase-goals/{goal_id}").status_code == 204
    assert client.get("/api/v1/purchase-goals").json() == []


# ─── projection ─────────────────────────────────────────────────────────────

def test_projection_aggregates_shared_space(client, db_session, user, partner):
    _seed_closed_months(db_session, user.id, partner.id)
    db_session.add(PurchaseGoal(
        name="Imóvel", target_amount=200000, saved_amount=10000,
        monthly_contribution=2000, saved_amount_source="manual",
        priority="alta", target_date=date(2031, 9, 1), user_id=user.id))
    db_session.commit()

    r = client.get("/api/v1/plan/projection")
    assert r.status_code == 200
    data = r.json()

    # capacidade do casal: (4000-2000) + (6000-3000) = 5000 — não só do usuário logado
    assert data["evidence"]["monthly_capacity"] == 5000.0
    assert data["evidence"]["closed_months"] == 5

    assert len(data["monthly"]) == 120
    assert data["monthly"][0]["goal_total_real"] is not None
    goal = data["goals"][0]
    assert goal["name"] == "Imóvel"
    assert goal["projected_amount"] is not None
    assert goal["projected_amount_real"] is not None
    assert goal["status"] in ("on_track", "at_risk")

    assert data["assumptions"]["return_is_guaranteed"] is False
    assert any("premissas" in w or "simulações" in w for w in data["warnings"])
    assert data["allocation"]["requested_monthly"] == 2000.0
    assert {s["key"] for s in data["scenarios"]} == {"conservative", "base", "optimistic"}


def test_projection_without_history_has_no_forecast(client):
    r = client.get("/api/v1/plan/projection")
    data = r.json()
    assert data["evidence"]["monthly_capacity"] is None
    assert data["allocation"]["available_monthly"] is None
    assert all(m["goal_total"] is None for m in data["monthly"])
    assert any("3 meses" in w for w in data["warnings"])


def test_projection_includes_partner_goals(client, db_session, user, partner):
    """Metas do parceiro entram no plano compartilhado."""
    _seed_closed_months(db_session, user.id, partner.id, months=3)
    db_session.add(PurchaseGoal(
        name="Meta da Bia", target_amount=5000, saved_amount=0,
        monthly_contribution=100, saved_amount_source="manual",
        priority="media", target_date=None, user_id=partner.id))
    db_session.commit()

    goals = client.get("/api/v1/plan/projection").json()["goals"]
    assert [g["name"] for g in goals] == ["Meta da Bia"]


# ─── insights ────────────────────────────────────────────────────────────────

def test_insights_fact_impact_action(client, db_session, user, partner):
    _seed_closed_months(db_session, user.id, partner.id)
    db_session.add(PurchaseGoal(
        name="Cara demais", target_amount=500000, saved_amount=0,
        monthly_contribution=10, saved_amount_source="manual",
        priority="alta", target_date=date(2027, 9, 1), user_id=user.id))
    db_session.commit()

    r = client.get("/api/v1/plan/insights")
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 1
    item = items[0]
    assert "Capacidade observada" in item["fact"]
    assert "Cara demais" in item["impact"]
    assert item["action"]
    assert item["assumptions"]["return_is_guaranteed"] is False
    assert item["evidence_period"]["start"]


def test_insights_empty_without_evidence(client):
    assert client.get("/api/v1/plan/insights").json() == []


def test_plan_requires_authentication(db_session):
    """Sem override de usuário, os endpoints exigem bearer token."""
    from fastapi.testclient import TestClient
    from app.dependencies import get_db
    app.dependency_overrides[get_db] = lambda: iter([db_session])
    anonymous = TestClient(app)
    assert anonymous.get("/api/v1/plan/projection").status_code == 401
