"""Cotações automáticas de investimentos.

- Ações / FIIs / ETFs / BDRs da B3: brapi.dev (grátis, 15k req/mês;
  token opcional via BRAPI_TOKEN aumenta os tickers disponíveis).
- Cripto: CoinGecko API pública (ticker = id do CoinGecko, ex.: "bitcoin").

Preço novo → current_value = quantity * price (exige quantity e ticker).
"""
from typing import Optional
import httpx
from app.config import get_settings


def fetch_b3_price(ticker: str) -> Optional[float]:
    settings = get_settings()
    params = {"token": settings.BRAPI_TOKEN} if settings.BRAPI_TOKEN else {}
    try:
        response = httpx.get(f"https://brapi.dev/api/quote/{ticker}", params=params, timeout=30)
        if response.status_code != 200:
            return None
        results = response.json().get("results") or []
        if not results:
            return None
        price = results[0].get("regularMarketPrice")
        return float(price) if price is not None else None
    except (httpx.HTTPError, ValueError, KeyError):
        return None


def fetch_crypto_price_brl(coingecko_id: str) -> Optional[float]:
    try:
        response = httpx.get(
            "https://api.coingecko.com/api/v3/simple/price",
            params={"ids": coingecko_id, "vs_currencies": "brl"},
            timeout=30,
        )
        if response.status_code != 200:
            return None
        price = response.json().get(coingecko_id.lower(), {}).get("brl")
        return float(price) if price is not None else None
    except (httpx.HTTPError, ValueError, KeyError):
        return None


def fetch_price(asset_type: str, ticker: str) -> Optional[float]:
    if asset_type == "crypto":
        return fetch_crypto_price_brl(ticker)
    return fetch_b3_price(ticker.upper())
