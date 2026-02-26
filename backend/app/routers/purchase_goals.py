from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.models.purchase_goal import PurchaseGoal
from app.models.user import User
from app.schemas.purchase_goal import (
    DepositRequest,
    PurchaseGoalCreate,
    PurchaseGoalResponse,
    PurchaseGoalUpdate,
)

router = APIRouter(prefix="/purchase-goals", tags=["purchase-goals"])


@router.get("", response_model=list[PurchaseGoalResponse])
def list_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(PurchaseGoal)
        .filter(PurchaseGoal.user_id == current_user.id)
        .order_by(PurchaseGoal.created_at.desc())
        .all()
    )


@router.post("", response_model=PurchaseGoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(
    body: PurchaseGoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = PurchaseGoal(**body.model_dump(), user_id=current_user.id)
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.get("/{goal_id}", response_model=PurchaseGoalResponse)
def get_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = db.query(PurchaseGoal).filter(
        PurchaseGoal.id == goal_id, PurchaseGoal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Objetivo não encontrado")
    return goal


@router.put("/{goal_id}", response_model=PurchaseGoalResponse)
def update_goal(
    goal_id: int,
    body: PurchaseGoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = db.query(PurchaseGoal).filter(
        PurchaseGoal.id == goal_id, PurchaseGoal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Objetivo não encontrado")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)
    db.commit()
    db.refresh(goal)
    return goal


@router.patch("/{goal_id}/deposit", response_model=PurchaseGoalResponse)
def deposit_to_goal(
    goal_id: int,
    body: DepositRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = db.query(PurchaseGoal).filter(
        PurchaseGoal.id == goal_id, PurchaseGoal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Objetivo não encontrado")
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Valor deve ser positivo")

    goal.saved_amount = float(goal.saved_amount) + body.amount
    if goal.saved_amount >= float(goal.target_amount):
        goal.is_completed = True
    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = db.query(PurchaseGoal).filter(
        PurchaseGoal.id == goal_id, PurchaseGoal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Objetivo não encontrado")
    db.delete(goal)
    db.commit()
