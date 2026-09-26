import sys
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

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
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


def test_bot_presence_in_friend_list(client):
    """
    SOC-UNIT-06 — Injeção permanente do MIST Companion Bot na lista de amigos
    """
    headers = {"X-User-Id": "1"}
    resp = client.get("/friends", headers=headers)
    assert resp.status_code == 200
    friends = resp.json()
    assert isinstance(friends, list)
    assert len(friends) >= 1

    bot = next((f for f in friends if f.get("friend_user_id") == 0), None)
    assert bot is not None
    assert bot["username"] == "MIST Bot"
    assert bot["is_bot"] is True
    assert bot["presence_status"] == "online"
    assert "MIST" in bot["current_game"]


def test_bot_chat_message_auto_reply_rest(client):
    """
    SOC-UNIT-07 — Auto-resposta do Companion Bot via endpoint REST de mensagens
    """
    headers = {"X-User-Id": "1"}
    room_id = "direct_0_1"

    # Envia mensagem perguntando sobre recomendações de jogos
    send_resp = client.post(
        f"/chat/{room_id}/messages",
        headers=headers,
        json={"content": "Oi MIST Bot, me recomenda um jogo legal?"}
    )
    assert send_resp.status_code == 201

    # Consulta o histórico da sala para validar a resposta automática do bot
    hist_resp = client.get(f"/chat/{room_id}/messages", headers=headers)
    assert hist_resp.status_code == 200
    messages = hist_resp.json()
    assert len(messages) >= 2

    # Verifica mensagem do usuário e resposta do bot (sender_id == 0)
    user_msg = messages[0]
    bot_msg = messages[1]
    assert user_msg["sender_id"] == 1
    assert bot_msg["sender_id"] == 0
    assert len(bot_msg["content"]) > 0


def test_bot_websocket_chat_flow(client):
    """
    SOC-UNIT-08 — Fluxo em tempo real via WebSocket com o Companion Bot
    """
    room_id = "direct_0_2"
    with client.websocket_connect(f"/ws/chat/{room_id}?user_id=2") as ws:
        # Envia mensagem pelo WebSocket
        ws.send_json({
            "type": "message",
            "content": "Como funcionam as conquistas?",
            "sender_id": 2
        })

        # Recebe broadcast da mensagem enviada
        echo_data = ws.receive_json()
        assert echo_data["type"] == "message"
        assert echo_data["sender_id"] == 2

        # Recebe indicador de digitação do bot
        typing_on = ws.receive_json()
        assert typing_on["type"] == "typing"
        assert typing_on["user_id"] == 0
        assert typing_on["is_typing"] is True

        # Recebe fim do indicador de digitação
        typing_off = ws.receive_json()
        assert typing_off["type"] == "typing"
        assert typing_off["user_id"] == 0
        assert typing_off["is_typing"] is False

        # Recebe a resposta do bot
        bot_reply = ws.receive_json()
        assert bot_reply["type"] == "message"
        assert bot_reply["sender_id"] == 0
        assert "conquista" in bot_reply["content"].lower() or "xp" in bot_reply["content"].lower() or len(bot_reply["content"]) > 0
