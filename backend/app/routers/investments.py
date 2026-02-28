from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.models.investment import Investment
from app.models.user import User
from app.schemas.investment import InvestmentCreate, InvestmentResponse, InvestmentSummary, InvestmentUpdate

router = APIRouter(prefix="/investments", tags=["investments"])


@router.get("", response_model=list[InvestmentResponse])
def list_investments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Investment).all()


@router.post("", response_model=InvestmentResponse, status_code=status.HTTP_201_CREATED)
def create_investment(
    body: InvestmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = Investment(**body.model_dump(), user_id=current_user.id)
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv


@router.get("/summary", response_model=InvestmentSummary)
def investment_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    investments = db.query(Investment).all()
    total_invested = sum(float(i.amount_invested) for i in investments)
    total_current = sum(float(i.current_value) for i in investments)
    gain_loss = total_current - total_invested
    gain_loss_pct = (gain_loss / total_invested * 100) if total_invested > 0 else 0.0

    by_type: dict[str, float] = {}
    for inv in investments:
        by_type[inv.asset_type] = by_type.get(inv.asset_type, 0.0) + float(inv.current_value)

    return InvestmentSummary(
        total_invested=total_invested,
        total_current=total_current,
        gain_loss=gain_loss,
        gain_loss_pct=gain_loss_pct,
        by_type=by_type,
    )


@router.get("/{investment_id}", response_model=InvestmentResponse)
def get_investment(
    investment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = db.query(Investment).filter(Investment.id == investment_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investimento não encontrado")
    return inv


@router.put("/{investment_id}", response_model=InvestmentResponse)
def update_investment(
    investment_id: int,
    body: InvestmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = db.query(Investment).filter(Investment.id == investment_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investimento não encontrado")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(inv, field, value)
    db.commit()
    db.refresh(inv)
    return inv


@router.delete("/{investment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_investment(
    investment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv = db.query(Investment).filter(Investment.id == investment_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investimento não encontrado")
    db.delete(inv)
    db.commit()
