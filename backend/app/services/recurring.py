"""Detecção heurística de séries recorrentes (assinaturas e contas fixas).

Mecânica (padrão Rocket Money/Monarch, sem LLM):
- Normaliza o descritor (remove dígitos, pontuação, sufixos de cartão) e
  agrupa transações por (descritor normalizado, tipo).
- Grupo com >= MIN_OCCURRENCES e intervalos regulares (mediana ~7/30/365
  dias) e valor estável vira uma série com cadência, valor esperado e dia
  esperado.
- Aumento de preço: última cobrança > mediana das anteriores acima do
  limiar (>5% e >R$ 2).
"""
import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date
from statistics import median
from sqlalchemy.orm import Session
from app.models.transaction import Transaction

MIN_OCCURRENCES = 3
# (nome, mediana mínima, mediana máxima) do intervalo em dias
CADENCES = [
    ("weekly", 5.0, 9.0),
    ("monthly", 24.0, 36.0),
    ("yearly", 330.0, 400.0),
]
CADENCE_DAYS = {"weekly": 7, "monthly": 30, "yearly": 365}


def normalize_description(desc: str) -> str:
    text = unicodedata.normalize("NFKD", desc or "").encode("ascii", "ignore").decode()
    text = text.lower()
    text = re.sub(r"\d+", " ", text)          # números (datas, parcelas, finais de cartão)
    text = re.sub(r"[^a-z ]", " ", text)      # pontuação e símbolos
    text = re.sub(r"\s+", " ", text).strip()
    return text


@dataclass
class RecurringSeries:
    key: str
    description: str            # descritor mais recente (exibição)
    type: str                   # income|expense
    cadence: str                # weekly|monthly|yearly
    expected_amount: float      # mediana das ocorrências
    last_amount: float
    last_date: date
    expected_day: int           # dia do mês (mensal) ou dia da semana (semanal)
    occurrences: int
    monthly_cost: float         # custo normalizado por mês
    price_increased: bool
    price_change: float         # last - mediana das anteriores
    active: bool                # última ocorrência dentro de ~2 ciclos
    category_id: int | None = None
    category_name: str | None = None
    category_icon: str | None = None
    user_ids: list[int] = field(default_factory=list)


def detect_series(db: Session, today: date | None = None) -> list[RecurringSeries]:
    today = today or date.today()
    txs = (
        db.query(Transaction)
        .order_by(Transaction.date.asc(), Transaction.id.asc())
        .all()
    )

    groups: dict[tuple[str, str], list[Transaction]] = {}
    for tx in txs:
        key = normalize_description(tx.description)
        if len(key) < 3:
            continue
        groups.setdefault((key, tx.type), []).append(tx)

    series: list[RecurringSeries] = []
    for (key, tx_type), items in groups.items():
        if len(items) < MIN_OCCURRENCES:
            continue

        # Uma ocorrência por dia (evita compras repetidas no mesmo dia)
        by_day: dict[date, Transaction] = {}
        for tx in items:
            by_day[tx.date] = tx
        occ = sorted(by_day.values(), key=lambda t: t.date)
        if len(occ) < MIN_OCCURRENCES:
            continue

        intervals = [(occ[i + 1].date - occ[i].date).days for i in range(len(occ) - 1)]
        med_interval = median(intervals)
        cadence = next((name for name, lo, hi in CADENCES if lo <= med_interval <= hi), None)
        if cadence is None:
            continue

        amounts = [float(t.amount) for t in occ]
        med_amount = median(amounts)
        if med_amount <= 0:
            continue
        # Valor estável: variação mediana <= 25% (assinaturas variam pouco;
        # contas de consumo variam um pouco mais, ainda passam)
        spread = median(abs(a - med_amount) for a in amounts)
        if spread / med_amount > 0.25:
            continue

        last = occ[-1]
        previous_amounts = amounts[:-1]
        prev_median = median(previous_amounts) if previous_amounts else med_amount
        change = float(last.amount) - prev_median
        increased = tx_type == "expense" and change > max(2.0, prev_median * 0.05)

        cycle = CADENCE_DAYS[cadence]
        active = (today - last.date).days <= cycle * 2 + 5

        series.append(RecurringSeries(
            key=key,
            description=last.description,
            type=tx_type,
            cadence=cadence,
            expected_amount=round(med_amount, 2),
            last_amount=float(last.amount),
            last_date=last.date,
            expected_day=last.date.day if cadence != "weekly" else last.date.weekday(),
            occurrences=len(occ),
            monthly_cost=round(med_amount * (30 / cycle), 2),
            price_increased=increased,
            price_change=round(change, 2),
            active=active,
            category_id=last.category_id,
            category_name=last.category.name if last.category else None,
            category_icon=last.category.icon if last.category else None,
            user_ids=sorted({t.user_id for t in occ}),
        ))

    series.sort(key=lambda s: s.monthly_cost, reverse=True)
    return series


def recurring_keys(series: list[RecurringSeries]) -> set[tuple[str, str]]:
    return {(s.key, s.type) for s in series}


def declared_recurring_pending(db: Session, month: int, year: int) -> list[Transaction]:
    """Séries declaradas pelo usuário (is_recurrent) sem lançamento no mês alvo.

    Retorna o lançamento mais recente de cada série (molde para materializar).
    """
    declared = (
        db.query(Transaction)
        .filter(Transaction.is_recurrent.is_(True))
        .order_by(Transaction.date.asc(), Transaction.id.asc())
        .all()
    )

    latest_by_key: dict[tuple[str, str, int], Transaction] = {}
    posted_in_target: set[tuple[str, str, int]] = set()
    for tx in declared:
        key = (normalize_description(tx.description), tx.type, tx.user_id)
        latest_by_key[key] = tx
        if tx.date.month == month and tx.date.year == year:
            posted_in_target.add(key)

    # Qualquer transação do mês (mesmo não marcada) com o mesmo descritor conta
    # como "já lançada" — evita duplicar depois de um import OFX.
    from sqlalchemy import extract
    month_txs = (
        db.query(Transaction)
        .filter(extract("month", Transaction.date) == month, extract("year", Transaction.date) == year)
        .all()
    )
    for tx in month_txs:
        posted_in_target.add((normalize_description(tx.description), tx.type, tx.user_id))

    target_first = date(year, month, 1)
    pending = [
        tx for key, tx in latest_by_key.items()
        if key not in posted_in_target and tx.date < target_first
    ]
    pending.sort(key=lambda t: t.recurrence_day or t.date.day)
    return pending
