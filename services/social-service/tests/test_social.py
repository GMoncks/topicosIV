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

    # Antes de aceitar, lista de amigos humanos de ambos deve ser vazia
    res1 = client.get("/friends", headers={"X-User-Id": "1"})
    assert res1.status_code == 200
    assert len([f for f in res1.json() if not f.get("is_bot")]) == 0

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
    friends1 = [f for f in res_friends1.json() if not f.get("is_bot")]
    assert len(friends1) == 1
    assert friends1[0]["friend_user_id"] == 2
    assert friends1[0]["status"] == "accepted"

    res_friends2 = client.get("/friends", headers={"X-User-Id": "2"})
    assert res_friends2.status_code == 200
    friends2 = [f for f in res_friends2.json() if not f.get("is_bot")]
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

    # Lista de amigos humanos agora deve estar vazia
    res_friends = client.get("/friends", headers={"X-User-Id": "1"})
    assert len([f for f in res_friends.json() if not f.get("is_bot")]) == 0



def test_record_and_list_activities(client):
    # 1. Registra atividade de conquista desbloqueada
    payload = {
        "user_id": 1,
        "type": "achievement_unlocked",
        "payload": {
            "game_id": 13,
            "achievement_id": "first_word",
            "name": "Primeira Palavra"
        }
    }
    res_create = client.post("/activities", json=payload)
    assert res_create.status_code == 201
    act_data = res_create.json()
    assert act_data["user_id"] == 1
    assert act_data["type"] == "achievement_unlocked"
    assert act_data["payload"]["achievement_id"] == "first_word"

    # 2. Consulta feed de atividades filtrado por user_id
    res_list = client.get("/activities?user_id=1")
    assert res_list.status_code == 200
    activities = res_list.json()
    assert len(activities) >= 1
    assert activities[0]["type"] == "achievement_unlocked"

    # 3. Consulta feed global (/feed)
    res_feed = client.get("/feed")
    assert res_feed.status_code == 200
    assert len(res_feed.json()) >= 1


def test_websocket_chat_send_receive_and_history(client):
    room_id = "direct_1_2"
    with client.websocket_connect(f"/ws/chat/{room_id}?user_id=1") as ws1:
        with client.websocket_connect(f"/ws/chat/{room_id}?user_id=2") as ws2:
            ws1.send_json({
                "type": "message",
                "content": "Olá CyberKnight! Vamos jogar?",
                "sender_id": 1
            })
            msg1 = ws1.receive_json()
            msg2 = ws2.receive_json()

            assert msg1["type"] == "message"
            assert msg1["content"] == "Olá CyberKnight! Vamos jogar?"
            assert msg1["sender_id"] == 1
            assert msg2["content"] == "Olá CyberKnight! Vamos jogar?"

    # Valida recuperação de histórico via REST
    resp = client.get(f"/chat/{room_id}/messages")
    assert resp.status_code == 200
    history = resp.json()
    assert len(history) >= 1
    assert any(m["content"] == "Olá CyberKnight! Vamos jogar?" for m in history)


def test_websocket_chat_typing_indicator(client):
    room_id = "direct_1_3"
    with client.websocket_connect(f"/ws/chat/{room_id}?user_id=1") as ws1:
        with client.websocket_connect(f"/ws/chat/{room_id}?user_id=3") as ws2:
            # ws1 envia evento de digitação
            ws1.send_json({
                "type": "typing",
                "is_typing": True
            })
            # ws2 deve receber a notificação de que o usuário 1 está digitando
            typing_event = ws2.receive_json()
            assert typing_event["type"] == "typing"
            assert typing_event["user_id"] == 1
            assert typing_event["is_typing"] is True


def test_chat_mark_read(client):
    room_id = "direct_1_2"
    resp = client.post(f"/chat/{room_id}/read", headers={"X-User-Id": "1"})
    assert resp.status_code == 200
    assert resp.json()["success"] is True


def test_websocket_presence_connect_and_snapshot(client):
    with client.websocket_connect("/ws/presence?user_id=1") as ws:
        # Recebe snapshot inicial
        data = ws.receive_json()
        assert data["type"] == "presence_snapshot"
        assert isinstance(data["users"], list)

        # Recebe broadcast de presença online do próprio usuário
        update = ws.receive_json()
        assert update["type"] == "presence_update"
        assert update["user_id"] == 1
        assert update["status"] == "online"


def test_presence_status_update_playing(client):
    with client.websocket_connect("/ws/presence?user_id=2") as ws:
        _ = ws.receive_json()  # snapshot
        _ = ws.receive_json()  # online

        # Atualiza status via endpoint REST interno (acionado pelo library-service)
        resp = client.post("/presence/status", json={
            "user_id": 2,
            "status": "playing",
            "game_id": 10,
            "game_title": "Helldivers 2"
        })
        assert resp.status_code == 200
        assert resp.json()["success"] is True

        # O WebSocket deve receber a notificação em tempo real
        update = ws.receive_json()
        assert update["type"] == "presence_update"
        assert update["user_id"] == 2
        assert update["status"] == "playing"
        assert update["game_title"] == "Helldivers 2"


def test_list_friends_with_presence_and_profiles(client):
    # Cria uma relação de amizade aceita
    res_req = client.post("/friends/request", json={"addressee_id": 2}, headers={"X-User-Id": "1"})
    friendship_id = res_req.json()["id"]
    client.post(f"/friends/accept/{friendship_id}", headers={"X-User-Id": "2"})

    # Simula status de jogo para o amigo 2
    resp_status = client.post("/presence/status", json={
        "user_id": 2,
        "status": "playing",
        "game_id": 10,
        "game_title": "Helldivers 2"
    })
    assert resp_status.status_code == 200

    resp = client.get("/friends", headers={"X-User-Id": "1"})
    assert resp.status_code == 200
    friends = resp.json()
    assert len(friends) >= 1

    friend2 = next((f for f in friends if f["friend_user_id"] == 2), None)
    assert friend2 is not None
    assert friend2["username"] == "CyberKnight"
    assert friend2["presence_status"] == "playing"
    assert friend2["current_game"] == "Helldivers 2"


def test_feed_activities_enriched(client):
    # Registra uma atividade de conquista
    client.post("/activities", json={
        "user_id": 2,
        "type": "achievement_unlocked",
        "payload": {
            "game_title": "Helldivers 2",
            "achievement_name": "Espalhando Democracia"
        }
    })
    # Registra uma atividade de compra
    client.post("/activities", json={
        "user_id": 3,
        "type": "game_purchased",
        "payload": {
            "game_title": "Hollow Knight",
            "price": 46.99
        }
    })

    resp = client.get("/feed")
    assert resp.status_code == 200
    activities = resp.json()
    assert len(activities) >= 2
    types = [a["type"] for a in activities]
    assert "achievement_unlocked" in types
    assert "game_purchased" in types

