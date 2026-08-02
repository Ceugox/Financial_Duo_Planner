from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import get_settings
import logging

settings = get_settings()
logger = logging.getLogger(__name__)

# SQLite needs check_same_thread=False; PostgreSQL ignores it via connect_args
connect_args = {}
db_url = settings.database_url_fix

if db_url.startswith("sqlite"):
    logger.warning("Using SQLite database. This should be temporary outside local development.")
    connect_args = {"check_same_thread": False}
else:
    logger.info("Connected to database: %s", db_url.split(":")[0])

engine = create_engine(
    db_url,
    connect_args=connect_args,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def create_tables() -> None:
    """Create all tables. Called on app startup."""
    from app.models import (  # noqa: F401
        user, category, transaction, investment, purchase_goal,
        category_rule, bank_connection, settlement, budget, staged_transaction,
    )
    Base.metadata.create_all(bind=engine)
    _run_column_migrations()


# Colunas adicionadas depois do schema inicial — create_all não altera tabelas
# existentes, então aplicamos ALTER TABLE idempotente aqui (SQLite e Postgres).
_COLUMN_MIGRATIONS: dict[str, list[tuple[str, str]]] = {
    "transactions": [
        ("is_shared", "BOOLEAN NOT NULL DEFAULT 1"),
        ("external_id", "VARCHAR(120)"),
        ("source", "VARCHAR(20) NOT NULL DEFAULT 'manual'"),
    ],
    "investments": [
        ("ticker", "VARCHAR(40)"),
        ("external_id", "VARCHAR(160)"),
        ("source", "VARCHAR(20) NOT NULL DEFAULT 'manual'"),
    ],
}


def _run_column_migrations() -> None:
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    with engine.begin() as conn:
        for table, columns in _COLUMN_MIGRATIONS.items():
            if not inspector.has_table(table):
                continue
            existing = {c["name"] for c in inspector.get_columns(table)}
            for name, ddl in columns:
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
                    logger.info("Migração: coluna %s.%s criada", table, name)
