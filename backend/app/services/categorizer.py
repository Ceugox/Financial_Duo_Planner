"""Categorização automática por regras (descrição contém pattern → categoria)."""
from typing import Optional
from sqlalchemy.orm import Session
from app.models.category_rule import CategoryRule


def load_rules(db: Session) -> list[CategoryRule]:
    # Pattern mais longo primeiro: "uber eats" vence "uber"
    return db.query(CategoryRule).order_by(CategoryRule.pattern.desc()).all()


def categorize(description: str, rules: list[CategoryRule]) -> Optional[int]:
    desc = description.lower()
    best: Optional[CategoryRule] = None
    for rule in rules:
        if rule.pattern.lower() in desc:
            if best is None or len(rule.pattern) > len(best.pattern):
                best = rule
    return best.category_id if best else None
