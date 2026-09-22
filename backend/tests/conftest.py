import os
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base  # noqa: E402
from app.dependencies import get_current_user, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.user import User  # noqa: E402
from app.services.auth_service import hash_password  # noqa: E402

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _override_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSession()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def user(db_session) -> User:
    item = User(
        email="ana@teste.dev", name="Ana",
        hashed_password=hash_password("senha123"), is_active=True,
    )
    db_session.add(item)
    db_session.commit()
    return item


@pytest.fixture()
def partner(db_session) -> User:
    item = User(
        email="bia@teste.dev", name="Bia",
        hashed_password=hash_password("senha456"), is_active=True,
    )
    db_session.add(item)
    db_session.commit()
    return item


@pytest.fixture()
def client(db_session, user):
    """Client autenticado como `user`. Sem `with` para não rodar o lifespan."""
    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_current_user] = lambda: user
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture()
def auth_client(db_session):
    """Client sem override de autenticação — exercita o fluxo real de sessão."""
    app.dependency_overrides[get_db] = _override_db
    yield TestClient(app)
    app.dependency_overrides.clear()
