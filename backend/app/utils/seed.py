"""
Seed script: creates default categories and admin users from .env
Run: python -m app.utils.seed
"""
import sys
import os

# Allow running from backend/ directory
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import bcrypt
from app.database import SessionLocal, create_tables
from app.models.category import Category
from app.models.user import User
from app.config import get_settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

DEFAULT_CATEGORIES = [
    {"name": "Moradia", "type": "expense", "icon": "🏠", "color": "#EF4444"},
    {"name": "Alimentação", "type": "expense", "icon": "🛒", "color": "#F97316"},
    {"name": "Transporte", "type": "expense", "icon": "🚗", "color": "#EAB308"},
    {"name": "Saúde", "type": "expense", "icon": "💊", "color": "#84CC16"},
    {"name": "Lazer", "type": "expense", "icon": "🎭", "color": "#06B6D4"},
    {"name": "Educação", "type": "expense", "icon": "📚", "color": "#8B5CF6"},
    {"name": "Vestuário", "type": "expense", "icon": "👗", "color": "#EC4899"},
    {"name": "Utilidades", "type": "expense", "icon": "💡", "color": "#6B7280"},
    {"name": "Salário", "type": "income", "icon": "💰", "color": "#10B981"},
    {"name": "Investimentos", "type": "both", "icon": "📈", "color": "#3B82F6"},
    {"name": "Outros", "type": "both", "icon": "📌", "color": "#9CA3AF"},
]


def seed():
    create_tables()
    settings = get_settings()
    db = SessionLocal()

    try:
        # Seed categories
        existing_categories = db.query(Category).count()
        if existing_categories == 0:
            for cat_data in DEFAULT_CATEGORIES:
                cat = Category(**cat_data, is_default=True)
                db.add(cat)
            db.commit()
            print(f"[OK] {len(DEFAULT_CATEGORIES)} categorias padrão criadas.")
        else:
            print(f"[INFO]  Categorias já existem ({existing_categories}), pulando.")

        # Seed admin users
        admins = [
            (settings.ADMIN_EMAIL_1, settings.ADMIN_PASSWORD_1, settings.ADMIN_NAME_1),
            (settings.ADMIN_EMAIL_2, settings.ADMIN_PASSWORD_2, settings.ADMIN_NAME_2),
        ]

        for email, password, name in admins:
            if not email or not password:
                continue
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                print(f"[INFO]  Usuário {email} já existe, pulando.")
                continue
            user = User(
                email=email,
                name=name,
                hashed_password=hash_password(password),
                is_active=True,
            )
            db.add(user)
            db.commit()
            print(f"[OK] Usuário {email} criado.")

    finally:
        db.close()

    print("[SEED] Seed concluído!")


if __name__ == "__main__":
    seed()
