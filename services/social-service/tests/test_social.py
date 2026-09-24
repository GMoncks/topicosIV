import os
import sys
import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

SOCIAL_DIR = str(Path(__file__).resolve().parent.parent)
for mod in list(sys.modules.keys()):
    if mod == "app" or mod.startswith("app."):
        del sys.modules[mod]
if SOCIAL_DIR in sys.path:
    sys.path.remove(SOCIAL_DIR)
sys.path.insert(0, SOCIAL_DIR)

from app.main import app
from app.db.database import Base, get_db
from app.models.friend import Friend

# Banco SQLite em memória com StaticPool para isolar os testes
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
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


def test_social_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "social-service"


def test_friend_request_flow(client):
    # Usuário 1 solicita amizade ao Usuário 2
    response = client.post(
        "/friends/request",
        json={"addressee_id": 2},
        headers={"X-User-Id": "1"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["requester_id"] == 1
    assert data["addressee_id"] == 2
    assert data["status"] == "pending"
    friendship_id = data["id"]

    # Antes de aceitar, lista de amigos de ambos deve ser vazia
    res1 = client.get("/friends", headers={"X-User-Id": "1"})
    assert res1.status_code == 200
    assert len(res1.json()) == 0

    # Usuário 2 aceita o pedido de amizade
    res_accept = client.post(
        f"/friends/accept/{friendship_id}",
        headers={"X-User-Id": "2"}
    )
    assert res_accept.status_code == 200
    assert res_accept.json()["status"] == "accepted"

    # Agora ambos devem ver o outro na lista de amigos
    res_friends1 = client.get("/friends", headers={"X-User-Id": "1"})
    assert res_friends1.status_code == 200
    friends1 = res_friends1.json()
    assert len(friends1) == 1
    assert friends1[0]["friend_user_id"] == 2
    assert friends1[0]["status"] == "accepted"

    res_friends2 = client.get("/friends", headers={"X-User-Id": "2"})
    assert res_friends2.status_code == 200
    friends2 = res_friends2.json()
    assert len(friends2) == 1
    assert friends2[0]["friend_user_id"] == 1


def test_cannot_friend_self(client):
    response = client.post(
        "/friends/request",
        json={"addressee_id": 1},
        headers={"X-User-Id": "1"}
    )
    assert response.status_code == 400
    assert "mesmo" in response.json()["detail"].lower()


def test_duplicate_friend_request(client):
    # Primeiro pedido
    res1 = client.post(
        "/friends/request",
        json={"addressee_id": 3},
        headers={"X-User-Id": "1"}
    )
    assert res1.status_code == 201

    # Tentativa de duplicar pedido pendente pelo mesmo solicitante
    res2 = client.post(
        "/friends/request",
        json={"addressee_id": 3},
        headers={"X-User-Id": "1"}
    )
    assert res2.status_code == 400
    assert "já enviada" in res2.json()["detail"].lower()


def test_mutual_request_auto_accepts(client):
    # User 1 pede para User 4
    res1 = client.post(
        "/friends/request",
        json={"addressee_id": 4},
        headers={"X-User-Id": "1"}
    )
    assert res1.status_code == 201

    # User 4 pede para User 1 -> deve aceitar automaticamente
    res2 = client.post(
        "/friends/request",
        json={"addressee_id": 1},
        headers={"X-User-Id": "4"}
    )
    assert res2.status_code == 201
    assert res2.json()["status"] == "accepted"


def test_only_addressee_can_accept(client):
    res_req = client.post(
        "/friends/request",
        json={"addressee_id": 2},
        headers={"X-User-Id": "1"}
    )
    friendship_id = res_req.json()["id"]

    # O próprio solicitante (User 1) não pode aceitar seu próprio pedido
    res_fail1 = client.post(
        f"/friends/accept/{friendship_id}",
        headers={"X-User-Id": "1"}
    )
    assert res_fail1.status_code == 403

    # Um terceiro usuário (User 99) também não pode aceitar
    res_fail2 = client.post(
        f"/friends/accept/{friendship_id}",
        headers={"X-User-Id": "99"}
    )
    assert res_fail2.status_code == 403


def test_delete_friendship(client):
    res_req = client.post(
        "/friends/request",
        json={"addressee_id": 2},
        headers={"X-User-Id": "1"}
    )
    friendship_id = res_req.json()["id"]

    # Aceita
    client.post(f"/friends/accept/{friendship_id}", headers={"X-User-Id": "2"})

    # User 1 remove a amizade
    res_del = client.delete(
        f"/friends/{friendship_id}",
        headers={"X-User-Id": "1"}
    )
    assert res_del.status_code == 200
    assert res_del.json()["success"] is True

    # Lista agora deve estar vazia
    res_friends = client.get("/friends", headers={"X-User-Id": "1"})
    assert len(res_friends.json()) == 0
