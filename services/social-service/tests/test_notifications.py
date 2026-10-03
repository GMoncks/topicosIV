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

import app.models.activity  # noqa: F401
import app.models.message  # noqa: F401
import app.models.friend  # noqa: F401
try:
    import app.models.notification  # noqa: F401
except ImportError:
    pass

from app.main import app
from app.db.database import Base, get_db

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


def test_notification_model_creation():
    """NOTIF-UNIT-01: Valida criação e serialização do modelo Notification."""
    from app.models.notification import Notification

    notif = Notification(
        user_id=10,
        type="achievement_unlocked",
        title="Conquista Desbloqueada!",
        message="Você desbloqueou: Mestre do MIST",
        payload={"game_id": 1, "badge": "gold"},
        is_read=False
    )
    assert notif.user_id == 10
    assert notif.type == "achievement_unlocked"
    assert notif.title == "Conquista Desbloqueada!"
    assert notif.is_read is False

    d = notif.to_dict()
    assert d["type"] == "achievement_unlocked"
    assert d["title"] == "Conquista Desbloqueada!"
    assert d["payload"]["badge"] == "gold"
    assert d["is_read"] is False


def test_create_and_list_notifications(client):
    """NOTIF-UNIT-02: Criação e listagem de notificações com unread_count."""
    headers_user1 = {"X-User-Id": "1"}

    # Criação da notificação 1
    r1 = client.post(
        "/notifications",
        json={
            "user_id": 1,
            "type": "friend_request",
            "title": "Novo Pedido de Amizade",
            "message": "gabriel_t800 quer ser seu amigo",
            "payload": {"requester_id": 2}
        },
        headers=headers_user1
    )
    assert r1.status_code == 201
    notif1 = r1.json()
    assert notif1["id"] is not None
    assert notif1["is_read"] is False

    # Criação da notificação 2
    r2 = client.post(
        "/notifications",
        json={
            "user_id": 1,
            "type": "wishlist_discount",
            "title": "Promoção na Wishlist!",
            "message": "Elden Ring está com 30% OFF",
            "payload": {"game_id": 4, "discount": 30}
        },
        headers=headers_user1
    )
    assert r2.status_code == 201

    # Listagem de notificações do usuário 1
    res = client.get("/notifications", headers=headers_user1)
    assert res.status_code == 200
    data = res.json()
    assert data["unread_count"] == 2
    assert len(data["items"]) == 2
    # Notificação mais recente primeiro
    assert data["items"][0]["type"] == "wishlist_discount"


def test_mark_notification_as_read(client):
    """NOTIF-UNIT-03: Marcação individual de notificação como lida."""
    headers = {"X-User-Id": "1"}

    created = client.post(
        "/notifications",
        json={
            "user_id": 1,
            "type": "system",
            "title": "Bem-vindo ao MIST",
            "message": "Sua conta foi criada com sucesso."
        },
        headers=headers
    ).json()

    notif_id = created["id"]

    # Marcar como lida
    read_res = client.post(f"/notifications/{notif_id}/read", headers=headers)
    assert read_res.status_code == 200
    updated = read_res.json()
    assert updated["is_read"] is True

    # Verificar na listagem
    list_res = client.get("/notifications", headers=headers)
    assert list_res.json()["unread_count"] == 0


def test_mark_all_notifications_as_read(client):
    """NOTIF-UNIT-04: Marcação de todas as notificações do usuário como lidas."""
    headers = {"X-User-Id": "5"}

    for i in range(3):
        client.post(
            "/notifications",
            json={
                "user_id": 5,
                "type": "system",
                "title": f"Aviso {i+1}",
                "message": f"Mensagem de teste {i+1}"
            },
            headers=headers
        )

    # Verifica unread_count = 3
    assert client.get("/notifications", headers=headers).json()["unread_count"] == 3

    # Marcar todas como lidas
    mark_all = client.post("/notifications/read-all", headers=headers)
    assert mark_all.status_code == 200
    assert mark_all.json()["updated_count"] == 3

    # Verifica unread_count = 0
    assert client.get("/notifications", headers=headers).json()["unread_count"] == 0


def test_notification_user_isolation(client):
    """NOTIF-UNIT-05: Isolamento estrito entre usuários nas notificações."""
    headers_user1 = {"X-User-Id": "1"}
    headers_user2 = {"X-User-Id": "2"}

    # Cria para o usuário 1
    notif1 = client.post(
        "/notifications",
        json={
            "user_id": 1,
            "type": "system",
            "title": "Privado do Usuário 1",
            "message": "Apenas o usuário 1 deve ver"
        },
        headers=headers_user1
    ).json()

    # Usuário 2 consulta suas notificações: lista vazia
    res_user2 = client.get("/notifications", headers=headers_user2)
    assert res_user2.status_code == 200
    assert len(res_user2.json()["items"]) == 0
    assert res_user2.json()["unread_count"] == 0

    # Usuário 2 tenta marcar como lida a notificação do usuário 1: 404 Not Found
    forbidden_read = client.post(f"/notifications/{notif1['id']}/read", headers=headers_user2)
    assert forbidden_read.status_code in (403, 404)


def test_websocket_notifications_broadcast(client):
    """NOTIF-UNIT-06: Notificações em tempo real via WebSocket."""
    with client.websocket_connect("/ws/notifications?user_id=42") as websocket:
        # Quando criamos uma notificação para o usuário 42, ela deve ser empurrada pelo websocket
        client.post(
            "/notifications",
            json={
                "user_id": 42,
                "type": "trade_offer",
                "title": "Nova Oferta de Troca",
                "message": "sarah_connor enviou uma oferta de troca de item",
                "payload": {"trade_id": 101}
            },
            headers={"X-User-Id": "42"}
        )

        # Recebe payload em tempo real pelo websocket
        data = websocket.receive_json()
        assert data["type"] == "trade_offer"
        assert data["title"] == "Nova Oferta de Troca"
        assert data["payload"]["trade_id"] == 101
