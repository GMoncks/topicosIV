import sys
from pathlib import Path
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

from app.main import app
from app.db.database import Base, get_db
from app.models.achievement import Achievement, UserAchievement
from app.services.library_service import LibraryService
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


def test_seed_achievements_and_query(db_session, client):
    """
    Testa a população automática de conquistas e a consulta via API.
    """
    # Executa a seed com o fallback local
    created = seed_achievements(db_session)
    assert created > 0

    # Consulta conquistas do jogo 13 (MIST Forca)
    resp = client.get("/library/games/13/achievements")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 3
    ach_ids = {a["achievement_id"] for a in data}
    assert "first_word" in ach_ids
    assert "flawless_win" in ach_ids
    assert "hangman_master" in ach_ids

    # Nenhuma deve estar desbloqueada inicialmente
    for a in data:
        assert a["is_unlocked"] is False
        assert a["unlocked_at"] is None


def test_unlock_achievement_and_status(db_session, client):
    """
    Testa o desbloqueio de conquista e a reflexão no endpoint GET com X-User-Id.
    """
    seed_achievements(db_session)

    # 1. Desbloqueia conquista para o user 1 no jogo 13
    unlock_resp = client.post(
        "/achievements/unlock",
        json={
            "user_id": 1,
            "game_id": 13,
            "achievement_id": "first_word"
        }
    )
    assert unlock_resp.status_code == 200
    assert unlock_resp.json()["status"] == "unlocked"
    assert unlock_resp.json()["created"] is True

    # 2. Desbloqueio duplicado deve ser idempotente
    dup_resp = client.post(
        "/achievements/unlock",
        json={
            "user_id": 1,
            "game_id": 13,
            "achievement_id": "first_word"
        }
    )
    assert dup_resp.status_code == 200
    assert dup_resp.json()["status"] == "already_unlocked"
    assert dup_resp.json()["created"] is False

    # 3. Consulta com o header X-User-Id = 1
    resp_user1 = client.get(
        "/library/games/13/achievements",
        headers={"X-User-Id": "1"}
    )
    assert resp_user1.status_code == 200
    data1 = resp_user1.json()
    first_word = next(a for a in data1 if a["achievement_id"] == "first_word")
    assert first_word["is_unlocked"] is True
    assert first_word["unlocked_at"] is not None

    other_ach = next(a for a in data1 if a["achievement_id"] == "flawless_win")
    assert other_ach["is_unlocked"] is False

    # 4. Consulta para outro usuário (user 2) deve retornar como não desbloqueada
    resp_user2 = client.get(
        "/library/games/13/achievements",
        headers={"X-User-Id": "2"}
    )
    assert resp_user2.status_code == 200
    data2 = resp_user2.json()
    first_word_user2 = next(a for a in data2 if a["achievement_id"] == "first_word")
    assert first_word_user2["is_unlocked"] is False
