"""Conexões Open Finance (Pluggy) e import de extrato OFX."""
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.models.bank_connection import BankConnection
from app.models.transaction import Transaction
from app.models.user import User
from app.services import pluggy
from app.services.categorizer import categorize, load_rules
from app.services.ofx_parser import parse_ofx

router = APIRouter(prefix="/connections", tags=["connections"])
logger = logging.getLogger(__name__)


class ConnectionCreate(BaseModel):
    item_id: str = Field(min_length=8, max_length=80)
    nickname: str = Field(min_length=1, max_length=100)


class ConnectionResponse(BaseModel):
    id: int
    provider: str
    item_id: str
    nickname: str
    user_id: int
    last_synced_at: Optional[datetime]

    model_config = {"from_attributes": True}


class ConnectionsStatus(BaseModel):
    pluggy_configured: bool
    connections: list[ConnectionResponse]


class SyncResult(BaseModel):
    inserted: int             # lançadas automaticamente como gasto/receita
    transfers: int            # lançadas automaticamente como transferência interna
    needs_review: int         # possíveis duplicatas de lançamento manual — ficam na fila
    skipped_duplicates: int   # já importadas antes (external_id)
    uncategorized: int
    accounts: int


class OfxImportResult(BaseModel):
    inserted: int
    transfers: int
    needs_review: int
    skipped_duplicates: int
    uncategorized: int
    parsed: int


def _import_entries(
    db: Session,
    user_id: int,
    entries: list[dict],
    source: str,
) -> dict:
    """Triagem automática do import (pedido do Marcell: nada de aprovar 1 a 1).

    - Transferência interna detectada (fatura de cartão, conta oculta, par
      casado) → vira Transaction com is_transfer=True (fora dos números).
    - Possível duplicata de lançamento confirmado (mesmo tipo/valor ±R$0,05,
      ±3 dias) → fica pendente na fila de revisão; só esses pedem um clique.
    - Resto → vira Transaction direto (pessoal por padrão; is_shared é
      decisão humana).

    Toda linha importada mantém um StagedTransaction como trilha de auditoria
    e âncora do dedupe por external_id.
    """
    from datetime import date as date_type
    from app.models.staged_transaction import StagedTransaction
    from app.routers.review import _find_duplicate
    from app.services.transfers import classify_description, detect_pairs, load_transfer_rules

    rules = load_rules(db)
    transfer_rules = load_transfer_rules(db)

    external_ids = [e["external_id"] for e in entries]
    existing: set[str] = set()
    if external_ids:
        # Dedupe contra lançamentos já confirmados (imports antigos, pré-staging)...
        rows = db.query(Transaction.external_id).filter(Transaction.external_id.in_(external_ids)).all()
        existing = {r[0] for r in rows}
        # ...e contra a própria fila (pendentes, aceitas e descartadas)
        rows = db.query(StagedTransaction.external_id).filter(StagedTransaction.external_id.in_(external_ids)).all()
        existing |= {r[0] for r in rows}

    # Normaliza as entradas novas e classifica transferência por descritor
    new_rows: list[dict] = []
    skipped = 0
    for entry in entries:
        if entry["external_id"] in existing:
            skipped += 1
            continue
        existing.add(entry["external_id"])
        entry_date = entry["date"]
        if isinstance(entry_date, str):
            entry_date = date_type.fromisoformat(entry_date[:10])
        new_rows.append({
            **entry,
            "date": entry_date,
            "transfer_reason": classify_description(entry["description"], transfer_rules),
        })

    # Par casado: entre as entradas novas ainda sem motivo e a fila pendente
    class _P:
        def __init__(self, pid, type_, amount, description, date_):
            self.id, self.type, self.amount, self.description, self.date = pid, type_, amount, description, date_

    candidates = [
        _P(f"n{i}", r["type"], r["amount"], r["description"], r["date"])
        for i, r in enumerate(new_rows) if not r["transfer_reason"]
    ]
    pending = db.query(StagedTransaction).filter(StagedTransaction.status == "pending").all()
    candidates += [_P(f"p{s.id}", s.type, float(s.amount), s.description, s.date) for s in pending]
    pair_reasons = detect_pairs(candidates)
    for i, r in enumerate(new_rows):
        if not r["transfer_reason"] and f"n{i}" in pair_reasons:
            r["transfer_reason"] = pair_reasons[f"n{i}"]

    inserted = transfers = needs_review = uncategorized = 0
    now = datetime.now(timezone.utc)
    for r in new_rows:
        category_id = categorize(r["description"], rules)
        staged = StagedTransaction(
            external_id=r["external_id"],
            source=source,
            type=r["type"],
            amount=r["amount"],
            description=r["description"],
            date=r["date"],
            suggested_category_id=category_id,
            user_id=user_id,
        )
        db.add(staged)

        is_transfer = r["transfer_reason"] is not None
        if not is_transfer and _find_duplicate(db, staged):
            # Só possíveis duplicatas de lançamento manual esperam revisão humana
            needs_review += 1
            continue

        if category_id is None and not is_transfer:
            uncategorized += 1
        tx = Transaction(
            type=r["type"],
            amount=r["amount"],
            description=r["description"],
            category_id=None if is_transfer else category_id,
            date=r["date"],
            user_id=user_id,
            external_id=r["external_id"],
            source=source,
            is_shared=False,
            is_transfer=is_transfer,
        )
        db.add(tx)
        db.flush()
        staged.status = "accepted"
        staged.transaction_id = tx.id
        staged.reviewed_at = now
        if is_transfer:
            transfers += 1
        else:
            inserted += 1

    db.commit()
    return {
        "inserted": inserted,
        "transfers": transfers,
        "needs_review": needs_review,
        "skipped_duplicates": skipped,
        "uncategorized": uncategorized,
    }


@router.get("", response_model=ConnectionsStatus)
def list_connections(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return ConnectionsStatus(
        pluggy_configured=pluggy.is_configured(),
        connections=db.query(BankConnection).order_by(BankConnection.id).all(),
    )


@router.post("", response_model=ConnectionResponse, status_code=status.HTTP_201_CREATED)
def create_connection(
    body: ConnectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if db.query(BankConnection).filter(BankConnection.item_id == body.item_id).first():
        raise HTTPException(status_code=409, detail="Este item já está conectado")

    try:
        item = pluggy.get_item(body.item_id)
    except pluggy.PluggyNotConfigured as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except pluggy.PluggyError as exc:
        raise HTTPException(status_code=502, detail=f"Item não encontrado na Pluggy: {exc}")

    connection = BankConnection(
        item_id=body.item_id,
        nickname=body.nickname or item.get("connector", {}).get("name", "Banco"),
        user_id=current_user.id,
    )
    db.add(connection)
    db.commit()
    db.refresh(connection)
    return connection


@router.delete("/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_connection(
    connection_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    connection = db.query(BankConnection).filter(BankConnection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Conexão não encontrada")
    db.delete(connection)
    db.commit()


@router.post("/{connection_id}/sync", response_model=SyncResult)
def sync_connection(
    connection_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    connection = db.query(BankConnection).filter(BankConnection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Conexão não encontrada")

    # Janela: desde o último sync (com 7 dias de sobreposição; dedupe segura) ou 90 dias
    if connection.last_synced_at:
        date_from = (connection.last_synced_at - timedelta(days=7)).strftime("%Y-%m-%d")
    else:
        date_from = (datetime.now(timezone.utc) - timedelta(days=90)).strftime("%Y-%m-%d")

    try:
        accounts = pluggy.list_accounts(connection.item_id)
        entries: list[dict] = []
        for account in accounts:
            for tx in pluggy.list_transactions(account["id"], date_from):
                amount = float(tx.get("amount") or 0)
                if amount == 0:
                    continue
                # Cartão de crédito na Pluggy: positivo = gasto; conta: negativo = débito
                is_credit_card = (account.get("type") or "").upper() == "CREDIT"
                is_expense = amount > 0 if is_credit_card else amount < 0
                entries.append({
                    "external_id": f"pluggy:{tx['id']}",
                    "type": "expense" if is_expense else "income",
                    "amount": abs(amount),
                    "description": (tx.get("description") or "Sem descrição")[:255],
                    "date": str(tx.get("date", ""))[:10],
                })
    except pluggy.PluggyNotConfigured as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except pluggy.PluggyError as exc:
        logger.error("Sync Pluggy falhou: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc))

    result = _import_entries(db, connection.user_id, entries, source="pluggy")
    connection.last_synced_at = datetime.now(timezone.utc)
    db.commit()

    return SyncResult(**result, accounts=len(accounts))


class InvestmentSyncRequest(BaseModel):
    # Remove os investimentos cadastrados à mão, deixando só o espelho da corretora
    remove_manual: bool = False


class InvestmentSyncResult(BaseModel):
    created: int
    updated: int
    removed_sold: int        # posições desta conexão que sumiram na corretora
    removed_manual: int
    total_positions: int


# Tipo/subtipo Pluggy → asset_type do app
_PLUGGY_TYPE_MAP = {
    "EQUITY": "acoes",
    "ETF": "fundos",
    "MUTUAL_FUND": "fundos",
    "FIXED_INCOME": "renda_fixa",
    "COE": "outros",
    "SECURITY": "outros",     # previdência
}
_PLUGGY_SUBTYPE_MAP = {
    "FII": "fiis",
    "REAL_ESTATE_FUND": "fiis",
    "ETF": "fundos",
    "SAVINGS": "poupanca",
    "CRYPTOCURRENCY": "crypto",
}


def _map_asset_type(inv: dict) -> str:
    subtype = (inv.get("subtype") or "").upper()
    if subtype in _PLUGGY_SUBTYPE_MAP:
        return _PLUGGY_SUBTYPE_MAP[subtype]
    return _PLUGGY_TYPE_MAP.get((inv.get("type") or "").upper(), "outros")


@router.post("/{connection_id}/sync-investments", response_model=InvestmentSyncResult)
def sync_investments(
    connection_id: int,
    body: InvestmentSyncRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Espelha as posições da corretora (Open Finance) na carteira.

    Upsert por posição; posições vendidas (desta conexão) saem; com
    remove_manual=True os cadastros manuais são substituídos pelo espelho.
    """
    from app.models.investment import Investment

    connection = db.query(BankConnection).filter(BankConnection.id == connection_id).first()
    if not connection:
        raise HTTPException(status_code=404, detail="Conexão não encontrada")

    try:
        positions = pluggy.list_investments(connection.item_id)
    except pluggy.PluggyNotConfigured as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except pluggy.PluggyError as exc:
        logger.error("Sync de investimentos Pluggy falhou: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc))

    prefix = f"pluggy:{connection.item_id}:"
    existing = {
        inv.external_id: inv
        for inv in db.query(Investment).filter(Investment.external_id.like(f"{prefix}%")).all()
    }

    created = updated = 0
    seen: set[str] = set()
    for pos in positions:
        balance = float(pos.get("balance") or 0)
        if balance <= 0:
            continue
        external_id = f"{prefix}{pos['id']}"
        seen.add(external_id)

        # Investido: valor original quando a Pluggy informa; senão saldo - lucro; senão o próprio saldo
        original = pos.get("amountOriginal")
        profit = pos.get("amountProfit")
        if original is not None:
            invested = float(original)
        elif profit is not None:
            invested = balance - float(profit)
        else:
            invested = balance

        quantity = pos.get("quantity")
        values = {
            "name": (pos.get("name") or "Investimento")[:255],
            "asset_type": _map_asset_type(pos),
            "amount_invested": round(max(invested, 0), 2),
            "current_value": round(balance, 2),
            "quantity": float(quantity) if quantity else None,
            "ticker": (pos.get("code") or None),
            "broker": (pos.get("issuer") or connection.nickname or None),
        }

        inv = existing.get(external_id)
        if inv:
            for field, value in values.items():
                setattr(inv, field, value)
            updated += 1
        else:
            db.add(Investment(
                **values,
                external_id=external_id,
                source="pluggy",
                user_id=connection.user_id,
            ))
            created += 1

    # Posições desta conexão que não vieram mais (vendidas/zeradas)
    removed_sold = 0
    for external_id, inv in existing.items():
        if external_id not in seen:
            db.delete(inv)
            removed_sold += 1

    removed_manual = 0
    if body.remove_manual:
        manual = db.query(Investment).filter(Investment.source == "manual").all()
        removed_manual = len(manual)
        for inv in manual:
            db.delete(inv)

    db.commit()
    return InvestmentSyncResult(
        created=created,
        updated=updated,
        removed_sold=removed_sold,
        removed_manual=removed_manual,
        total_positions=len(seen),
    )


@router.post("/import-ofx", response_model=OfxImportResult)
async def import_ofx(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    raw = await file.read()
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Arquivo muito grande (máx. 5 MB)")

    try:
        content = raw.decode("utf-8")
    except UnicodeDecodeError:
        content = raw.decode("latin-1")

    parsed = parse_ofx(content)
    if not parsed:
        raise HTTPException(status_code=422, detail="Nenhuma transação encontrada no arquivo (é um OFX válido?)")

    entries = [{
        "external_id": f"ofx:{tx.fitid}",
        "type": "expense" if tx.amount < 0 else "income",
        "amount": abs(tx.amount),
        "description": tx.description,
        "date": tx.date,
    } for tx in parsed]

    result = _import_entries(db, current_user.id, entries, source="ofx")
    return OfxImportResult(**result, parsed=len(parsed))
