from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.models.category import Category
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(Category).all()


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    body: CategoryCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    cat = Category(**body.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    body: CategoryUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(cat, field, value)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    if cat.is_default:
        raise HTTPException(status_code=400, detail="Não é possível excluir categorias padrão")
    db.delete(cat)
    db.commit()
