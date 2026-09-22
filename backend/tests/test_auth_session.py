"""Testes do fluxo de sessão com refresh token em cookie HttpOnly."""
from app.services.auth_service import create_refresh_token

COOKIE = "finance_refresh"


def test_login_sets_httponly_cookie_and_no_refresh_in_body(auth_client, user):
    r = auth_client.post("/api/v1/auth/login",
                         json={"email": "ana@teste.dev", "password": "senha123"})
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"]
    assert "refresh_token" not in body

    cookie = r.cookies.get(COOKIE)
    assert cookie is not None
    set_cookie = r.headers["set-cookie"]
    assert "httponly" in set_cookie.lower()
    assert "samesite=lax" in set_cookie.lower()
    assert "path=/api/v1/auth" in set_cookie.lower()


def test_login_wrong_password(auth_client, user):
    r = auth_client.post("/api/v1/auth/login",
                         json={"email": "ana@teste.dev", "password": "errada"})
    assert r.status_code == 401


def test_refresh_without_cookie_is_rejected(auth_client, user):
    assert auth_client.post("/api/v1/auth/refresh").status_code == 401


def test_refresh_with_cookie_issues_access_token_and_rotates(auth_client, user):
    auth_client.cookies.set(COOKIE, create_refresh_token({"sub": str(user.id)}))
    r = auth_client.post("/api/v1/auth/refresh")
    assert r.status_code == 200
    assert r.json()["access_token"]
    # rotação: um novo cookie de refresh é emitido a cada refresh
    assert COOKIE in (r.headers.get("set-cookie") or "")


def test_refresh_rejects_access_token_as_cookie(auth_client, user):
    from app.services.auth_service import create_access_token
    auth_client.cookies.set(COOKIE, create_access_token({"sub": str(user.id)}))
    assert auth_client.post("/api/v1/auth/refresh").status_code == 401


def test_me_with_bearer_token(auth_client, user):
    r = auth_client.post("/api/v1/auth/login",
                         json={"email": "ana@teste.dev", "password": "senha123"})
    token = r.json()["access_token"]
    me = auth_client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "ana@teste.dev"


def test_logout_clears_cookie(auth_client, user):
    auth_client.cookies.set(COOKIE, create_refresh_token({"sub": str(user.id)}))
    r = auth_client.post("/api/v1/auth/logout")
    assert r.status_code == 204
    set_cookie = r.headers.get("set-cookie", "")
    assert COOKIE in set_cookie
    # cookie expirado/removido
    assert 'max-age=0' in set_cookie.lower() or 'expires=' in set_cookie.lower()
