import os
import sys
import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

STORE_DIR = str(Path(__file__).resolve().parent.parent)
for mod in list(sys.modules.keys()):
    if mod == "app" or mod.startswith("app."):
        del sys.modules[mod]
if STORE_DIR in sys.path:
    sys.path.remove(STORE_DIR)
sys.path.insert(0, STORE_DIR)

from app.main import app
from app.db.database import Base, get_db
from app.db.seed import seed_games

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    json_serializer=lambda obj: json.dumps(obj, ensure_ascii=False)
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
    db = TestingSessionLocal()
    seed_games(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


def test_curator_recommendations_guest(client):
    """
    STORE-UNIT-07 — Recomendações do AI Curator para visitante sem autenticação
    """
    response = client.get("/store/recommendations?limit=4")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) <= 4
    for game in data:
        assert "title" in game
        assert "recommendation_score" in game
        assert "recommendation_reason" in game
        assert isinstance(game["recommendation_score"], (int, float))
        assert isinstance(game["recommendation_reason"], str)


def test_curator_recommendations_authenticated(client):
    """
    STORE-UNIT-08 — Recomendações personalizadas do AI Curator com X-User-Id
    """
    headers = {"X-User-Id": "1"}
    response = client.get("/store/recommendations?limit=3", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 3
    for game in data:
        assert game["recommendation_score"] >= 0
        assert len(game["recommendation_reason"]) > 0


def test_curator_recommendations_limit_validation(client):
    """
    STORE-UNIT-09 — Validação de limites na rota de recomendações do Curator
    """
    resp_limit_2 = client.get("/store/recommendations?limit=2")
    assert resp_limit_2.status_code == 200
    assert len(resp_limit_2.json()) == 2

    resp_invalid = client.get("/store/recommendations?limit=0")
    assert resp_invalid.status_code == 422
