"""Detecção de transferências internas nos imports (Open Finance/OFX).

Movimentação entre contas próprias não é gasto nem receita. Três sinais,
todos heurísticos (padrão Monarch/Copilot, sem LLM):

1. Pagamento de fatura de cartão: o gasto real são as compras do cartão
   (ou a fatura lançada à mão); o débito em conta que a quita é interno.
2. Regra de conta oculta (TransferRule): contas usadas como reserva mas
   não conectadas ao app (ex.: 99Pay rendendo) — o aporte não é despesa.
3. Par casado: saída e entrada de mesmo valor (±R$0,05) em até 3 dias
   dentro da própria fila — Pix/TED entre as contas conectadas do casal.
"""
from typing import Optional, Protocol
from sqlalchemy.orm import Session
from app.models.transfer_rule import TransferRule
from app.services.recurring import normalize_description

# Descritores típicos de quitação de fatura (conta corrente E lado do cartão,
# onde o pagamento entra como crédito) e de aplicação/resgate de reserva.
# Comparados contra a descrição normalizada (minúscula, sem acentos/dígitos).
CARD_PAYMENT_PATTERNS = [
    "pagamento fatura",
    "pagamento de fatura",
    "pgto fatura",
    "pgto de fatura",
    "pagto fatura",
    "pag fatura",
    "fatura cartao",
    "pagamento cartao",
    "pgto cartao",
    "pagto cartao",
    "pagamento de cartao",
    "pagamento efetuado",      # lado do cartão (Itaú)
    "pagamento recebido",      # lado do cartão (Nubank)
]

INTERNAL_MOVE_PATTERNS = [
    "aplicacao",               # aplicação em CDB/RDB/fundo dentro do banco
    "resgate",
]

PAIR_WINDOW_DAYS = 3
PAIR_TOLERANCE = 0.05
PAIR_MIN_AMOUNT = 10.0


def load_transfer_rules(db: Session) -> list[str]:
    return [r.pattern for r in db.query(TransferRule).order_by(TransferRule.pattern).all()]


def classify_description(description: str, rules: list[str]) -> Optional[str]:
    """Motivo (texto pt-BR para o UI) se a descrição indicar transferência."""
    norm = normalize_description(description)
    if not norm:
        return None
    for pattern in CARD_PAYMENT_PATTERNS:
        if pattern in norm:
            return "pagamento de fatura de cartão"
    for pattern in INTERNAL_MOVE_PATTERNS:
        if norm.startswith(pattern):
            return "aplicação/resgate no próprio banco"
    for raw in rules:
        rule_norm = normalize_description(raw)
        if rule_norm and rule_norm in norm:
            return f'conta oculta "{raw}"'
    return None


class _Entry(Protocol):
    id: int
    type: str
    amount: object
    description: str
    date: object


def detect_pairs(items: list[_Entry]) -> dict[int, str]:
    """Pares saída↔entrada de mesmo valor em janela curta → transferência.

    Retorna {id do item: motivo}. Cada entrada casa com no máximo uma saída.
    """
    reasons: dict[int, str] = {}
    incomes = [i for i in items if i.type == "income" and float(i.amount) >= PAIR_MIN_AMOUNT]
    used: set[int] = set()
    for expense in items:
        if expense.type != "expense" or float(expense.amount) < PAIR_MIN_AMOUNT:
            continue
        for income in incomes:
            if income.id in used:
                continue
            if abs(float(income.amount) - float(expense.amount)) > PAIR_TOLERANCE:
                continue
            if abs((income.date - expense.date).days) > PAIR_WINDOW_DAYS:
                continue
            used.add(income.id)
            reasons[expense.id] = f'entrada e saída casadas com "{income.description}"'
            reasons[income.id] = f'entrada e saída casadas com "{expense.description}"'
            break
    return reasons
