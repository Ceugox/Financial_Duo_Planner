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
    from app.models import user, category, transaction, investment, purchase_goal  # noqa: F401
    Base.metadata.create_all(bind=engine)
