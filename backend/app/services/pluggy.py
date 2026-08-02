"""Cliente Pluggy (Open Finance Brasil via Meu Pluggy).

Fluxo free para uso pessoal:
1. Cada pessoa conecta seus bancos em https://meu.pluggy.ai (consentimento
   Open Finance regulado, prazo indeterminado desde a Res. Conjunta 7/2023).
2. Em https://dashboard.pluggy.ai cria-se uma aplicação → client_id/secret.
3. Cada conexão bancária vira um Item; o item_id entra em /connections aqui.

Credenciais via env: PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET.
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
import httpx
from app.config import get_settings

BASE_URL = "https://api.pluggy.ai"

_api_key_cache: dict[str, Any] = {"key": None, "expires_at": None}


class PluggyNotConfigured(Exception):
    pass


class PluggyError(Exception):
    pass


def is_configured() -> bool:
    settings = get_settings()
    return bool(settings.PLUGGY_CLIENT_ID and settings.PLUGGY_CLIENT_SECRET)


def _get_api_key() -> str:
    """API key da Pluggy vale 2h; cacheamos por 100 min."""
    settings = get_settings()
    if not is_configured():
        raise PluggyNotConfigured(
            "Defina PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no .env "
            "(crie a aplicação em dashboard.pluggy.ai)."
        )

    now = datetime.now(timezone.utc)
    if _api_key_cache["key"] and _api_key_cache["expires_at"] and now < _api_key_cache["expires_at"]:
        return _api_key_cache["key"]

    response = httpx.post(
        f"{BASE_URL}/auth",
        json={"clientId": settings.PLUGGY_CLIENT_ID, "clientSecret": settings.PLUGGY_CLIENT_SECRET},
        timeout=30,
    )
    if response.status_code != 200:
        raise PluggyError(f"Falha na autenticação Pluggy ({response.status_code}): {response.text[:200]}")

    _api_key_cache["key"] = response.json()["apiKey"]
    _api_key_cache["expires_at"] = now + timedelta(minutes=100)
    return _api_key_cache["key"]


def _get(path: str, params: Optional[dict] = None) -> dict:
    # params=None preserva a query string embutida no path (httpx substitui
    # a query da URL quando params é passado, mesmo vazio)
    response = httpx.get(
        f"{BASE_URL}{path}",
        params=params,
        headers={"X-API-KEY": _get_api_key()},
        timeout=60,
    )
    if response.status_code != 200:
        raise PluggyError(f"Pluggy {path} retornou {response.status_code}: {response.text[:200]}")
    return response.json()


def get_item(item_id: str) -> dict:
    return _get(f"/items/{item_id}")


def list_accounts(item_id: str) -> list[dict]:
    return _get("/accounts", {"itemId": item_id}).get("results", [])


def list_investments(item_id: str) -> list[dict]:
    """Posições de investimento do item (corretora/banco), paginadas."""
    results: list[dict] = []
    page = 1
    while True:
        data = _get("/investments", {"itemId": item_id, "pageSize": 500, "page": page})
        results.extend(data.get("results", []))
        if page >= data.get("totalPages", 1):
            break
        page += 1
    return results


def list_transactions(account_id: str, date_from: Optional[str] = None) -> list[dict]:
    """Todas as transações da conta.

    v2: sem filtro de data nem pageSize — paginação via query string `next`
    ("?accountId=...&after=..."). O recorte por data (date_from) é aplicado
    aqui no cliente; o dedupe por external_id protege contra sobreposição.
    """
    results: list[dict] = []
    query: Optional[str] = f"?accountId={account_id}"
    while query:
        data = _get(f"/v2/transactions{query}")
        results.extend(data.get("results", []))
        query = data.get("next") or None

    if date_from:
        results = [tx for tx in results if str(tx.get("date", ""))[:10] >= date_from]
    return results
