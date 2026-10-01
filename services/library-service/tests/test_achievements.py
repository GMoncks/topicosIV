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
    Testa a população automática de conquistas e a consulta via API com isolamento por jogo.
    """
    # Executa a seed com o catálogo
    created = seed_achievements(db_session)
    assert created > 0

    # Consulta conquistas do jogo 14 (MIST Forca)
    resp_forca = client.get("/library/games/14/achievements")
    assert resp_forca.status_code == 200
    data_forca = resp_forca.json()
    assert len(data_forca) == 3
    ach_ids = {a["achievement_id"] for a in data_forca}
    assert "first_word" in ach_ids
    assert "flawless_win" in ach_ids
    assert "hangman_master" in ach_ids

    # Consulta conquistas do jogo 13 (Baldur's Gate 3) - não deve conter conquistas da Forca!
    resp_bg = client.get("/library/games/13/achievements")
    assert resp_bg.status_code == 200
    data_bg = resp_bg.json()
    assert len(data_bg) == 3
    bg_ids = {a["achievement_id"] for a in data_bg}
    assert "first_launch" in bg_ids
    assert "first_word" not in bg_ids

    # Consulta conquistas do jogo 15 (MIST Labirinto) - não deve conter conquistas do Quiz!
    resp_maze = client.get("/library/games/15/achievements")
    assert resp_maze.status_code == 200
    data_maze = resp_maze.json()
    assert len(data_maze) == 3
    maze_ids = {a["achievement_id"] for a in data_maze}
    assert "first_move" in maze_ids
    assert "first_answer" not in maze_ids

    # Nenhuma deve estar desbloqueada inicialmente
    for a in data_forca:
        assert a["is_unlocked"] is False
        assert a["unlocked_at"] is None


def test_unlock_achievement_and_status(db_session, client):
    """
    Testa o desbloqueio de conquista e a reflexão no endpoint GET com X-User-Id.
    """
    seed_achievements(db_session)

    # 1. Desbloqueia conquista para o user 1 no jogo 14 (MIST Forca)
    unlock_resp = client.post(
        "/achievements/unlock",
        json={
            "user_id": 1,
            "game_id": 14,
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
            "game_id": 14,
            "achievement_id": "first_word"
        }
    )
    assert dup_resp.status_code == 200
    assert dup_resp.json()["status"] == "already_unlocked"
    assert dup_resp.json()["created"] is False

    # 3. Consulta com o header X-User-Id = 1
    resp_user1 = client.get(
        "/library/games/14/achievements",
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
        "/library/games/14/achievements",
        headers={"X-User-Id": "2"}
    )
    assert resp_user2.status_code == 200
    data2 = resp_user2.json()
    first_word_user2 = next(a for a in data2 if a["achievement_id"] == "first_word")
    assert first_word_user2["is_unlocked"] is False


def test_seed_purges_corrupted_mixed_achievements(db_session, client):
    """
    Simula cenário onde o jogo 13 possuía conquistas da Forca e o jogo 15 possuía conquistas do Quiz,
    validando que nova execução do seed_achievements purga as duplicadas/intrusas.
    """
    # 1. Injeta conquista intrusa no jogo 13
    corrupted_ach1 = Achievement(
        game_id=13,
        achievement_id="first_word",
        name="Primeira Palavra (Intrusa)",
        description="Erro",
        icon_url="http://icon",
        rarity="Comum"
    )
    # Injeta conquista intrusa no jogo 15
    corrupted_ach2 = Achievement(
        game_id=15,
        achievement_id="first_answer",
        name="Curioso por Natureza (Intrusa)",
        description="Erro",
        icon_url="http://icon",
        rarity="Comum"
    )
    db_session.add(corrupted_ach1)
    db_session.add(corrupted_ach2)
    db_session.commit()

    # 2. Executa a seed
    seed_achievements(db_session)

    # 3. Baldur's Gate 3 deve ter exatamente 3 conquistas, sem first_word
    resp_13 = client.get("/library/games/13/achievements")
    assert resp_13.status_code == 200
    data_13 = resp_13.json()
    assert len(data_13) == 3
    assert not any(a["achievement_id"] == "first_word" for a in data_13)

    # 4. MIST Labirinto deve ter exatamente 3 conquistas, sem first_answer
    resp_15 = client.get("/library/games/15/achievements")
    assert resp_15.status_code == 200
    data_15 = resp_15.json()
    assert len(data_15) == 3
    assert not any(a["achievement_id"] == "first_answer" for a in data_15)
