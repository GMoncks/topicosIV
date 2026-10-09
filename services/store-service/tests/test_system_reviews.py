import sys
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
from app.models.system_review import SystemReview

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


def test_create_system_review_success(client):
    """Testa a criação de um review da plataforma MIST por usuário logado."""
    payload = {
        "content": "Plataforma fantástica! A integração do daemon com jogos locais é muito suave.",
        "is_recommended": True,
    }
    response = client.post(
        "/system-reviews",
        json=payload,
        headers={"X-User-Id": "42", "X-User-Username": "cyber_gamer"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["user_id"] == 42
    assert data["username"] == "cyber_gamer"
    assert data["content"] == payload["content"]
    assert data["is_recommended"] is True
    assert "created_at" in data
    assert data["created_at"] is not None


def test_create_system_review_unauthenticated(client):
    """Testa que usuários não autenticados recebem 401 ao tentar enviar review."""
    payload = {
        "content": "Tentativa de review anônimo sem header de identificação.",
        "is_recommended": False,
    }
    response = client.post("/system-reviews", json=payload)
    assert response.status_code == 401


def test_create_system_review_exceeds_500_chars(client):
    """Testa que reviews com mais de 500 caracteres são rejeitados com HTTP 422."""
    payload = {
        "content": "A" * 501,
        "is_recommended": True,
    }
    response = client.post(
        "/system-reviews",
        json=payload,
        headers={"X-User-Id": "1", "X-User-Username": "tester"},
    )
    assert response.status_code == 422


def test_create_system_review_empty_content(client):
    """Testa que review com conteúdo vazio é rejeitado com HTTP 422."""
    payload = {
        "content": "",
        "is_recommended": True,
    }
    response = client.post(
        "/system-reviews",
        json=payload,
        headers={"X-User-Id": "1", "X-User-Username": "tester"},
    )
    assert response.status_code == 422


def test_list_system_reviews(client):
    """Testa a listagem das avaliações do sistema em ordem cronológica reversa."""
    client.post(
        "/system-reviews",
        json={"content": "Primeiro feedback", "is_recommended": True},
        headers={"X-User-Id": "1", "X-User-Username": "alice"},
    )
    client.post(
        "/system-reviews",
        json={"content": "Segundo feedback", "is_recommended": False},
        headers={"X-User-Id": "2", "X-User-Username": "bob"},
    )

    response = client.get("/system-reviews")
    assert response.status_code == 200
    reviews = response.json()
    assert len(reviews) == 2
    # Ordem reversa: o mais recente vem primeiro
    assert reviews[0]["username"] == "bob"
    assert reviews[0]["content"] == "Segundo feedback"
    assert reviews[1]["username"] == "alice"
    assert reviews[1]["content"] == "Primeiro feedback"
