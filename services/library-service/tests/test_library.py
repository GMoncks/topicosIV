import sys
from pathlib import Path
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.exc import IntegrityError

# Isolamento do pacote app
LIBRARY_DIR = str(Path(__file__).resolve().parent.parent)
for mod in list(sys.modules.keys()):
    if mod == "app" or mod.startswith("app."):
        del sys.modules[mod]
if LIBRARY_DIR in sys.path:
    sys.path.remove(LIBRARY_DIR)
sys.path.insert(0, LIBRARY_DIR)

from app.main import app
from app.db.database import Base, get_db
from app.models.library_item import LibraryItem
from app.services.library_service import LibraryService

# Configura banco de dados em memória isolado com StaticPool
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


# ==============================================================================
# TESTES UNITÁRIOS — LIB-UNIT
# ==============================================================================

def test_lib_unit_01_create_library_item_defaults(db_session):
    """
    [LIB-UNIT-01] Verifica a instanciação de um LibraryItem e seus valores padrão.
    playtime_minutes=0, is_installed=False, last_played=None, acquired_at definido.
    """
    item = LibraryItem(
        user_id=1,
        game_id=42,
        acquired_at=datetime.now(timezone.utc)
    )
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)

    assert item.id is not None
    assert item.user_id == 1
    assert item.game_id == 42
    assert item.playtime_minutes == 0
    assert item.is_installed is False
    assert item.last_played is None
    assert item.acquired_at is not None

    d = item.to_dict()
    assert d["user_id"] == 1
    assert d["game_id"] == 42
    assert d["playtime_minutes"] == 0
    assert d["is_installed"] is False


def test_lib_unit_02_unique_constraint_user_game(db_session):
    """
    [LIB-UNIT-02] Garante que a restrição de unicidade (user_id, game_id)
    impede a inserção de registros duplicados no banco de dados.
    """
    item1 = LibraryItem(user_id=1, game_id=10, acquired_at=datetime.now(timezone.utc))
    db_session.add(item1)
    db_session.commit()

    item2 = LibraryItem(user_id=1, game_id=10, acquired_at=datetime.now(timezone.utc))
    db_session.add(item2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


# ==============================================================================
# TESTES DE INTEGRAÇÃO — LIB-INT
# ==============================================================================

def test_lib_int_01_grant_game_creates_item(client):
    """
    [LIB-INT-01] Verifica que POST /library/grant cria a licença e retorna status 201
    com payload informando created=True.
    """
    response = client.post("/library/grant", json={"user_id": 1, "game_id": 5})
    assert response.status_code == 201
    data = response.json()
    assert data["user_id"] == 1
    assert data["game_id"] == 5
    assert data["created"] is True
    assert "acquired_at" in data
    assert "id" in data


def test_lib_int_02_grant_game_idempotent(client):
    """
    [LIB-INT-02] Verifica a idempotência do endpoint POST /library/grant.
    A segunda concessão deve retornar 200 OK com created=False sem duplicar registro.
    """
    # Primeira concessão -> 201 Created
    res1 = client.post("/library/grant", json={"user_id": 2, "game_id": 8})
    assert res1.status_code == 201
    id1 = res1.json()["id"]

    # Segunda concessão (mesmo user e jogo) -> 200 OK
    res2 = client.post("/library/grant", json={"user_id": 2, "game_id": 8})
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["id"] == id1
    assert data2["created"] is False
    assert data2["user_id"] == 2
    assert data2["game_id"] == 8


def test_lib_int_03_get_my_games_success(client):
    """
    [LIB-INT-03] Verifica que GET /library/my-games com header X-User-Id válido
    retorna a lista de jogos adquiridos pelo usuário.
    """
    # Concede dois jogos ao usuário 3
    client.post("/library/grant", json={"user_id": 3, "game_id": 1})
    client.post("/library/grant", json={"user_id": 3, "game_id": 2})

    # Concede um jogo a outro usuário (4)
    client.post("/library/grant", json={"user_id": 4, "game_id": 3})

    response = client.get("/library/my-games", headers={"X-User-Id": "3"})
    assert response.status_code == 200
    games = response.json()
    assert len(games) == 2
    game_ids = {g["game_id"] for g in games}
    assert game_ids == {1, 2}
    for g in games:
        assert g["user_id"] == 3
        assert g["playtime_minutes"] == 0
        assert g["is_installed"] is False


def test_lib_int_04_get_my_games_unauthorized_when_missing_header(client):
    """
    [LIB-INT-04] Verifica que GET /library/my-games sem o cabeçalho X-User-Id
    ou com valor inválido é rejeitado com status 401 Unauthorized.
    """
    # Sem header
    res_no_header = client.get("/library/my-games")
    assert res_no_header.status_code == 401

    # Header com valor não numérico
    res_invalid = client.get("/library/my-games", headers={"X-User-Id": "abc"})
    assert res_invalid.status_code == 401

    # Header com valor zero ou negativo
    res_negative = client.get("/library/my-games", headers={"X-User-Id": "-1"})
    assert res_negative.status_code == 401


def test_lib_int_05_get_my_games_empty_for_user_without_games(client):
    """
    [LIB-INT-05] Verifica que GET /library/my-games para um usuário que ainda
    não possui jogos retorna uma lista vazia com status 200 OK.
    """
    response = client.get("/library/my-games", headers={"X-User-Id": "999"})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0
