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
from app.services.library_service import LibraryService
from app.models.quest import DynamicQuest

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


def test_generate_dynamic_quests(client):
    """
    LIB-UNIT-04 — Geração dinâmica de missões semanais pelo Quest Master
    """
    headers = {"X-User-Id": "1"}
    resp = client.get("/library/games/1/quests", headers=headers)
    assert resp.status_code == 200
    quests = resp.json()
    assert isinstance(quests, list)
    assert len(quests) == 3
    for q in quests:
        assert "title" in q
        assert "description" in q
        assert "xp_reward" in q
        assert q["xp_reward"] > 0
        assert "target_type" in q
        assert "progress" in q
        assert "week_key" in q


def test_idempotent_weekly_quests(client):
    """
    LIB-UNIT-04 (cont.) — Idempotência de missões semanais para o mesmo usuário e jogo
    """
    headers = {"X-User-Id": "1"}
    resp1 = client.get("/library/games/2/quests", headers=headers)
    resp2 = client.get("/library/games/2/quests", headers=headers)
    assert resp1.status_code == 200
    assert resp2.status_code == 200
    data1 = resp1.json()
    data2 = resp2.json()
    assert len(data1) == len(data2) == 3
    assert [q["id"] for q in data1] == [q["id"] for q in data2]


def test_claim_quest_lifecycle(client):
    """
    LIB-UNIT-05 — Ciclo de vida e resgate de recompensas de missões do Quest Master
    """
    db = TestingSessionLocal()
    quest = DynamicQuest(
        user_id=1,
        game_id=3,
        quest_key="test_quest_claim",
        title="Missão Teste",
        description="Teste de claim",
        xp_reward=250,
        target_type="playtime",
        target_value=10,
        progress=5,
        is_completed=False,
        is_claimed=False,
        week_key="2026-W39"
    )
    db.add(quest)
    db.commit()
    db.refresh(quest)
    quest_id = quest.id
    db.close()

    headers = {"X-User-Id": "1"}
    # 1. Tenta resgatar antes de completar -> 400
    fail_resp = client.post(f"/library/games/3/quests/{quest_id}/claim", headers=headers)
    assert fail_resp.status_code == 400
    assert "ainda não completado" in fail_resp.json()["detail"]

    # 2. Marca como completo
    db = TestingSessionLocal()
    q = db.query(DynamicQuest).filter_by(id=quest_id).first()
    q.is_completed = True
    db.commit()
    db.close()

    # 3. Resgata com sucesso -> 200
    claim_resp = client.post(f"/library/games/3/quests/{quest_id}/claim", headers=headers)
    assert claim_resp.status_code == 200
    assert claim_resp.json()["status"] == "claimed"
    assert claim_resp.json()["xp_reward"] == 250

    # 4. Tenta resgatar novamente -> 400 (já resgatada)
    repeat_resp = client.post(f"/library/games/3/quests/{quest_id}/claim", headers=headers)
    assert repeat_resp.status_code == 400
    assert "já resgatada" in repeat_resp.json()["detail"]


def test_internal_get_user_games(client):
    """
    LIB-UNIT-06 — Consulta interna de jogos do usuário para o AI Curator
    """
    db = TestingSessionLocal()
    LibraryService.grant_game(db, user_id=10, game_id=1)
    db.close()

    resp = client.get("/library/users/10/games")
    assert resp.status_code == 200
    games = resp.json()
    assert isinstance(games, list)
    assert len(games) >= 1
    assert games[0]["game_id"] == 1
