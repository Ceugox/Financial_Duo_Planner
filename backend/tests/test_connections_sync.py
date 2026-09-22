"""Testes de sincronização Pluggy — nunca destruir dados por ausência."""
import pytest

import app.services.pluggy as pluggy_module
from app.models.bank_connection import BankConnection
from app.models.investment import Investment


@pytest.fixture()
def connection(db_session, user):
    conn = BankConnection(provider="pluggy", item_id="item-abc",
                          nickname="Banco X", user_id=user.id, status="connected")
    db_session.add(conn)
    db_session.commit()
    return conn


def _manual(db, user):
    inv = Investment(name="Tesouro manual", asset_type="renda_fixa",
                     amount_invested=1000, current_value=1100,
                     source="manual", is_active=True, user_id=user.id)
    db.add(inv)
    return inv


def _pluggy_position(db, user, external_id="pluggy:item-abc:pos-1", active=True):
    inv = Investment(name="CDB antigo", asset_type="renda_fixa",
                     amount_invested=500, current_value=600,
                     source="pluggy", external_id=external_id,
                     is_active=active, user_id=user.id)
    db.add(inv)
    return inv


def _positions(*ids):
    return [dict(id=i, balance=700.0, name=f"Ativo {i}", type="FIXED_INCOME",
                 subtype=None, quantity=None, amountOriginal=650.0,
                 amountProfit=50.0) for i in ids]


def test_manual_positions_survive_sync(client, db_session, user, connection, monkeypatch):
    manual = _manual(db_session, user)
    db_session.commit()
    monkeypatch.setattr(pluggy_module, "list_investments",
                        lambda item_id: _positions("pos-nova"))

    r = client.post(f"/api/v1/connections/{connection.id}/sync-investments", json={})
    assert r.status_code == 200
    db_session.expire_all()
    assert db_session.get(Investment, manual.id) is not None
    assert db_session.get(Investment, manual.id).is_active is True


def test_missing_position_marked_inactive_not_deleted(client, db_session, user, connection, monkeypatch):
    old = _pluggy_position(db_session, user)
    db_session.commit()
    monkeypatch.setattr(pluggy_module, "list_investments",
                        lambda item_id: _positions("pos-nova"))

    r = client.post(f"/api/v1/connections/{connection.id}/sync-investments", json={})
    assert r.status_code == 200
    body = r.json()
    assert body["created"] == 1 and body["marked_inactive"] == 1
    assert body["removed_sold"] == 0 and body["removed_manual"] == 0

    db_session.expire_all()
    kept = db_session.get(Investment, old.id)
    assert kept is not None
    assert kept.is_active is False and kept.inactive_at is not None


def test_returning_position_is_reactivated(client, db_session, user, connection, monkeypatch):
    gone = _pluggy_position(db_session, user, active=False)
    db_session.commit()
    monkeypatch.setattr(pluggy_module, "list_investments",
                        lambda item_id: _positions("pos-1"))

    r = client.post(f"/api/v1/connections/{connection.id}/sync-investments", json={})
    assert r.status_code == 200
    db_session.expire_all()
    assert db_session.get(Investment, gone.id).is_active is True


def test_pluggy_failure_preserves_data_and_marks_error(client, db_session, user, connection, monkeypatch):
    manual = _manual(db_session, user)
    old = _pluggy_position(db_session, user)
    db_session.commit()

    def _boom(item_id):
        raise pluggy_module.PluggyError("provedor fora do ar")
    monkeypatch.setattr(pluggy_module, "list_investments", _boom)

    r = client.post(f"/api/v1/connections/{connection.id}/sync-investments", json={})
    assert r.status_code == 502

    db_session.expire_all()
    assert db_session.get(Investment, manual.id) is not None
    assert db_session.get(Investment, old.id).is_active is True
    conn = db_session.get(BankConnection, connection.id)
    assert conn.status == "error"
    assert "fora do ar" in conn.last_sync_error
    assert conn.last_sync_attempt_at is not None


def test_sync_marks_attempt_and_coverage(client, db_session, user, connection, monkeypatch):
    db_session.commit()
    monkeypatch.setattr(pluggy_module, "list_investments",
                        lambda item_id: _positions("p1", "p2"))

    r = client.post(f"/api/v1/connections/{connection.id}/sync-investments", json={})
    assert r.status_code == 200
    db_session.expire_all()
    conn = db_session.get(BankConnection, connection.id)
    assert conn.status == "connected"
    assert conn.last_sync_error is None
    assert conn.last_sync_attempt_at is not None
    assert '"active_positions": 2' in (conn.coverage_json or "")


def test_connect_token_requires_configuration(client):
    """Sem credenciais Pluggy o endpoint responde 400, nunca expõe segredo."""
    r = client.post("/api/v1/connections/connect-token")
    assert r.status_code == 400


def test_investments_list_hides_inactive_by_default(client, db_session, user):
    _manual(db_session, user)
    _pluggy_position(db_session, user, active=False)
    db_session.commit()

    active_only = client.get("/api/v1/investments").json()
    assert [i["name"] for i in active_only] == ["Tesouro manual"]

    everything = client.get("/api/v1/investments", params={"include_inactive": True}).json()
    assert len(everything) == 2
    assert {i["is_active"] for i in everything} == {True, False}
