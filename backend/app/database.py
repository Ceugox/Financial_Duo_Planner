from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import get_settings

settings = get_settings()

# SQLite needs check_same_thread=False; PostgreSQL ignores it via connect_args
connect_args = {}
if settings.database_url_fix.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.database_url_fix,
    connect_args=connect_args,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def create_tables() -> None:
    """Create all tables. Called on app startup."""
    from app.models import user, category, transaction, investment, purchase_goal  # noqa: F401
    Base.metadata.create_all(bind=engine)
