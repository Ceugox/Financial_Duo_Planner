"""Fila de revisão do Open Finance (padrão Copilot "Mark as Reviewed").

As transações importadas (Pluggy/OFX) entram como sugestões e só viram
lançamentos reais quando o casal aceita. A prévia mostra o impacto no mês
sem tocar nos números oficiais.
"""
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import extract, func
from sqlalchemy.orm import Session, joinedload
from app.dependencies import get_db, get_current_user
from app.models.staged_transaction import StagedTransaction
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.category import CategoryResponse
from app.services.transfers import classify_description, detect_pairs, load_transfer_rules

router = APIRouter(prefix="/review", tags=["review"])


class ReviewItem(BaseModel):
    id: int
    external_id: str
    source: str
    type: str
    amount: float
    description: str
    date: date
    suggested_category: Optional[CategoryResponse]
    possible_duplicate: bool
    duplicate_of: Optional[str]   # descrição do lançamento manual parecido
    transfer_suspect: bool
    transfer_reason: Optional[str]  # ex.: pagamento de fatura, conta oculta, par casado

    model_config = {"from_attributes": True}


class ReviewSummary(BaseModel):
    pending_count: int
    pending_expense: float
    pending_income: float
    # Prévia do mês corrente: como ficariam as despesas se tudo fosse aceito
    month_expense_current: float
    month_expense_if_accepted: float


class ReviewResponse(BaseModel):
    summary: ReviewSummary
    items: list[ReviewItem]


class AcceptRequest(BaseModel):
    category_id: Optional[int] = None
    is_shared: bool = True
    as_transfer: bool = False   # lança fora dos números (transferência interna)


class AcceptAllResult(BaseModel):
    accepted: int             # lançadas como gasto/receita (pessoais por padrão)
    accepted_transfers: int   # lançadas como transferência interna (fora dos números)
    skipped_duplicates: int   # possíveis duplicatas — continuam na fila


def _find_duplicate(db: Session, staged: StagedTransaction) -> Optional[Transaction]:
    """Lançamento confirmado parecido: mesmo tipo, mesmo valor (±5 centavos),
    até 3 dias de distância. Evita contar duas vezes o que já foi lançado à mão.

    Valores < R$ 5 nunca são suspeitos: a tolerância de ±5 centavos vira ruído
    em migalhas (dividendos/taxas de B3 de centavos) e o custo de errar é nulo."""
    if float(staged.amount) < 5:
        return None
    window = timedelta(days=3)
    return (
        db.query(Transaction)
        .filter(
            Transaction.type == staged.type,
            Transaction.is_transfer.is_(False),
            Transaction.amount >= float(staged.amount) - 0.05,
            Transaction.amount <= float(staged.amount) + 0.05,
            Transaction.date >= staged.date - window,
            Transaction.date <= staged.date + window,
        )
        .first()
    )


def _transfer_reasons(db: Session, pending: list[StagedTransaction]) -> dict[int, str]:
    """Motivo de suspeita de transferência por staged.id (descritor > par casado)."""
    rules = load_transfer_rules(db)
    reasons: dict[int, str] = {}
    unmatched: list[StagedTransaction] = []
    for staged in pending:
        reason = classify_description(staged.description, rules)
        if reason:
            reasons[staged.id] = reason
        else:
            unmatched.append(staged)
    reasons.update(detect_pairs(unmatched))
    return reasons


def _accept(
    db: Session,
    staged: StagedTransaction,
    category_id: Optional[int],
    is_shared: bool,
    as_transfer: bool = False,
) -> Transaction:
    tx = Transaction(
        type=staged.type,
        amount=staged.amount,
        description=staged.description,
        category_id=None if as_transfer else (category_id if category_id is not None else staged.suggested_category_id),
        date=staged.date,
        user_id=staged.user_id,
        external_id=staged.external_id,
        source=staged.source,
        # Transferência interna: fora dos agregados e do acerto do casal
        is_shared=False if as_transfer else is_shared,
        is_transfer=as_transfer,
    )
    db.add(tx)
    db.flush()
    staged.status = "accepted"
    staged.transaction_id = tx.id
    staged.reviewed_at = datetime.now(timezone.utc)
    return tx


@router.get("", response_model=ReviewResponse)
def list_pending(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    pending = (
        db.query(StagedTransaction)
        .options(joinedload(StagedTransaction.suggested_category))
        .filter(StagedTransaction.status == "pending")
        .order_by(StagedTransaction.date.desc(), StagedTransaction.id.desc())
        .all()
    )

    transfer_reasons = _transfer_reasons(db, pending)

    items: list[ReviewItem] = []
    for staged in pending:
        duplicate = _find_duplicate(db, staged)
        reason = transfer_reasons.get(staged.id)
        items.append(ReviewItem(
            id=staged.id,
            external_id=staged.external_id,
            source=staged.source,
            type=staged.type,
            amount=float(staged.amount),
            description=staged.description,
            date=staged.date,
            suggested_category=staged.suggested_category,
            possible_duplicate=duplicate is not None,
            duplicate_of=duplicate.description if duplicate else None,
            transfer_suspect=reason is not None,
            transfer_reason=reason,
        ))

    today = date.today()
    month_expense = float(
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.type == "expense",
            Transaction.is_transfer.is_(False),
            extract("month", Transaction.date) == today.month,
            extract("year", Transaction.date) == today.year,
        )
        .scalar()
    )
    pending_month_expense = sum(
        i.amount for i in items
        if i.type == "expense" and i.date.month == today.month and i.date.year == today.year
        and not i.possible_duplicate and not i.transfer_suspect
    )

    return ReviewResponse(
        summary=ReviewSummary(
            pending_count=len(items),
            pending_expense=round(sum(i.amount for i in items if i.type == "expense"), 2),
            pending_income=round(sum(i.amount for i in items if i.type == "income"), 2),
            month_expense_current=round(month_expense, 2),
            month_expense_if_accepted=round(month_expense + pending_month_expense, 2),
        ),
        items=items,
    )


@router.post("/{staged_id}/accept", status_code=status.HTTP_201_CREATED)
def accept_one(
    staged_id: int,
    body: AcceptRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    staged = db.query(StagedTransaction).filter(
        StagedTransaction.id == staged_id, StagedTransaction.status == "pending",
    ).first()
    if not staged:
        raise HTTPException(status_code=404, detail="Sugestão não encontrada ou já revisada")
    _accept(db, staged, body.category_id, body.is_shared, as_transfer=body.as_transfer)
    db.commit()
    return {"ok": True}


@router.post("/{staged_id}/dismiss", status_code=status.HTTP_200_OK)
def dismiss_one(
    staged_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    staged = db.query(StagedTransaction).filter(
        StagedTransaction.id == staged_id, StagedTransaction.status == "pending",
    ).first()
    if not staged:
        raise HTTPException(status_code=404, detail="Sugestão não encontrada ou já revisada")
    staged.status = "dismissed"
    staged.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True}


@router.post("/accept-all", response_model=AcceptAllResult)
def accept_all(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Triagem automática de tudo que está pendente (mesma regra do import):
    transferência detectada entra como transferência, possível duplicata de
    lançamento manual fica na fila, o resto entra como lançamento pessoal."""
    pending = db.query(StagedTransaction).filter(StagedTransaction.status == "pending").all()
    transfer_reasons = _transfer_reasons(db, pending)
    accepted = accepted_transfers = skipped = 0
    for staged in pending:
        if staged.id in transfer_reasons:
            _accept(db, staged, None, False, as_transfer=True)
            accepted_transfers += 1
            continue
        if _find_duplicate(db, staged):
            skipped += 1
            continue
        _accept(db, staged, None, False)
        accepted += 1
    db.commit()
    return AcceptAllResult(accepted=accepted, accepted_transfers=accepted_transfers, skipped_duplicates=skipped)
