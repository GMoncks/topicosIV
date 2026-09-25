import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import sys
from pathlib import Path

LIB_DIR = str(Path(__file__).resolve().parent.parent)
for mod in list(sys.modules.keys()):
    if mod == "app" or mod.startswith("app."):
        del sys.modules[mod]
if LIB_DIR in sys.path:
    sys.path.remove(LIB_DIR)
sys.path.insert(0, LIB_DIR)

from app.main import app
from app.db.database import Base, get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.mark.unit
def test_ownership_check_false_then_true_after_grant(client):
    """Valida que has-game retorna owned=False inicialmente e owned=True após concessão."""
    # Antes do grant
    resp = client.get("/library/users/42/has-game/101")
    assert resp.status_code == 200
    assert resp.json()["owned"] is False

    # Concede o jogo
    grant_resp = client.post("/library/grant", json={"user_id": 42, "game_id": 101})
    assert grant_resp.status_code == 201

    # Após o grant
    resp_after = client.get("/library/users/42/has-game/101")
    assert resp_after.status_code == 200
    assert resp_after.json()["owned"] is True
