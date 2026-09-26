import sys
from pathlib import Path
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

LIBRARY_DIR = str(Path(__file__).resolve().parent.parent)
for mod in list(sys.modules.keys()):
    if mod == "app" or mod.startswith("app."):
        del sys.modules[mod]
if LIBRARY_DIR in sys.path:
    sys.path.remove(LIBRARY_DIR)
sys.path.insert(0, LIBRARY_DIR)

import app.models.game_session  # noqa: F401
import app.models.library_item  # noqa: F401
import app.models.achievement  # noqa: F401
from app.main import app
from app.db.database import Base, get_db
from app.models.game_session import GameSession
from app.models.library_item import LibraryItem
from app.db.seed_achievements import seed_achievements

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
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    return TestClient(app)


def test_session_lifecycle_start_ping_end(db_session, client):
    """
    Testa o ciclo de vida completo de uma sessão:
    POST /session/start -> POST /session/ping (acumula playtime) -> POST /session/end
    """
    # 1. Inicia sessão para user 1 no jogo 13
    start_payload = {
        "user_id": 1,
        "game_id": 13,
        "session_token": "token_teste_123"
    }
    start_res = client.post("/session/start", json=start_payload)
    assert start_res.status_code == 200
    start_data = start_res.json()
    assert start_data["status"] == "active"
    assert "session_id" in start_data
    assert start_data["game_id"] == 13
    assert start_data["user_id"] == 1
    session_id = start_data["session_id"]

    # Verifica que item da biblioteca foi criado e marcado como is_installed = True
    item = db_session.query(LibraryItem).filter_by(user_id=1, game_id=13).first()
    assert item is not None
    assert item.is_installed is True
    assert item.playtime_minutes == 0

    # 2. Envia ping 1
    ping_payload = {
        "user_id": 1,
        "game_id": 13,
        "session_id": session_id
    }
    ping1_res = client.post("/session/ping", json=ping_payload)
    assert ping1_res.status_code == 200
    ping1_data = ping1_res.json()
    assert ping1_data["status"] == "active"
    assert ping1_data["playtime_minutes"] == 1

    # 3. Envia ping 2
    ping2_res = client.post("/session/ping", json=ping_payload)
    assert ping2_res.status_code == 200
    assert ping2_res.json()["playtime_minutes"] == 2

    # Verifica no banco que playtime_minutes acumulou 2 minutos
    db_session.refresh(item)
    assert item.playtime_minutes == 2

    # 4. Encerra a sessão
    end_payload = {
        "user_id": 1,
        "game_id": 13,
        "session_id": session_id
    }
    end_res = client.post("/session/end", json=end_payload)
    assert end_res.status_code == 200
    end_data = end_res.json()
    assert end_data["status"] == "ended"
    assert end_data["playtime_minutes"] == 2

    # Verifica que sessão foi marcada como ended
    sess = db_session.query(GameSession).filter_by(session_id=session_id).first()
    assert sess is not None
    assert sess.status == "ended"
    assert sess.ended_at is not None


def test_unlock_achievement_with_activity_dispatch(db_session, client):
    """
    Testa o desbloqueio de conquista e o disparo do evento de atividade para o social-service.
    """
    seed_achievements(db_session)

    with patch("app.services.library_service.LibraryService.dispatch_activity_event") as mock_dispatch:
        unlock_res = client.post(
            "/achievements/unlock",
            json={
                "user_id": 1,
                "game_id": 13,
                "achievement_id": "first_word"
            }
        )
        assert unlock_res.status_code == 200
        assert unlock_res.json()["status"] == "unlocked"
        assert unlock_res.json()["created"] is True

        # Verifica se chamou dispatch_activity_event com o payload correto
        assert mock_dispatch.called
        call_args = mock_dispatch.call_args
        posted_json = call_args[0][0]
        assert posted_json["type"] == "achievement_unlocked"
        assert posted_json["user_id"] == 1
        assert posted_json["payload"]["achievement_id"] == "first_word"
        assert posted_json["payload"]["name"] == "Primeira Palavra"



def test_recent_achievements_polling(db_session, client):
    """
    Testa o endpoint GET /achievements/recent para suportar polling leve no frontend (E-07).
    """
    seed_achievements(db_session)

    # 1. Sem autenticação deve retornar 401
    res_unauth = client.get("/achievements/recent")
    assert res_unauth.status_code == 401

    # 2. Desbloqueia conquista
    client.post(
        "/achievements/unlock",
        json={"user_id": 1, "game_id": 13, "achievement_id": "first_word"}
    )

    # 3. Consulta recentes com X-User-Id
    res_recent = client.get("/achievements/recent", headers={"X-User-Id": "1"})
    assert res_recent.status_code == 200
    recent_list = res_recent.json()
    assert len(recent_list) >= 1
    assert recent_list[0]["achievement_id"] == "first_word"
    assert recent_list[0]["name"] == "Primeira Palavra"
    assert recent_list[0]["rarity"] == "Comum"


def test_session_dispatches_presence_events(db_session, client):
    """
    Testa a integração entre library-service e social-service:
    Início de sessão despacha presença 'playing' e encerramento despacha 'online' (F-05).
    """
    with patch("app.services.library_service.LibraryService.dispatch_presence_event") as mock_presence:
        # Inicia sessão
        start_res = client.post(
            "/session/start",
            json={"user_id": 1, "game_id": 13, "session_token": "token_presenca"}
        )
        assert start_res.status_code == 200
        session_id = start_res.json()["session_id"]

        assert mock_presence.call_count >= 1
        args, kwargs = mock_presence.call_args
        assert kwargs.get("user_id") == 1
        assert kwargs.get("status") == "playing"
        assert kwargs.get("game_id") == 13
        assert kwargs.get("game_title") == "MIST Studios Adventure"

        mock_presence.reset_mock()

        # Encerra sessão
        end_res = client.post(
            "/session/end",
            json={"user_id": 1, "game_id": 13, "session_id": session_id}
        )
        assert end_res.status_code == 200

        assert mock_presence.call_count >= 1
        args, kwargs = mock_presence.call_args
        assert kwargs.get("user_id") == 1
        assert kwargs.get("status") == "online"
        assert kwargs.get("game_id") is None

