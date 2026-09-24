import os
import sys
import io
import json
import zipfile
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
from app.models.game import Game
from app.db.seed import seed_games

# Configura banco em memória isolado
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
    # Popula seed para incluir os mini-jogos
    db = TestingSessionLocal()
    try:
        seed_games(db)
    finally:
        db.close()
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


def test_download_forca_game_zip(client):
    # Localiza o jogo MIST Forca
    db = TestingSessionLocal()
    game = db.query(Game).filter(Game.title == "MIST Forca").first()
    db.close()
    assert game is not None

    response = client.get(
        f"/games/{game.id}/download",
        headers={
            "X-User-Id": "42",
            "X-User-Token": "jwt_real_teste_token_xyz"
        }
    )
    assert response.status_code == 200
    assert "application/zip" in response.headers.get("content-type", "")

    # Inspeciona o arquivo zip em memória
    zip_bytes = io.BytesIO(response.content)
    with zipfile.ZipFile(zip_bytes, "r") as zf:
        namelist = zf.namelist()
        assert "game.py" in namelist
        assert "mist_sdk.py" in namelist
        assert "session.json" in namelist

        # Verifica conteúdo do session.json
        session_content = json.loads(zf.read("session.json").decode("utf-8"))
        assert session_content["user_id"] == 42
        assert session_content["session_token"] == "jwt_real_teste_token_xyz"
        assert session_content["game_id"] == game.id
        assert session_content["game_title"] == "MIST Forca"

        # Verifica que o game.py contém código do jogo
        game_code = zf.read("game.py").decode("utf-8")
        assert "MIST FORCA" in game_code
        assert "import mist_sdk" in game_code


def test_download_labirinto_game_zip(client):
    db = TestingSessionLocal()
    game = db.query(Game).filter(Game.title == "MIST Labirinto").first()
    db.close()
    assert game is not None

    response = client.get(
        f"/games/{game.id}/download",
        headers={"X-User-Id": "10"}
    )
    assert response.status_code == 200

    zip_bytes = io.BytesIO(response.content)
    with zipfile.ZipFile(zip_bytes, "r") as zf:
        assert "game.py" in zf.namelist()
        game_code = zf.read("game.py").decode("utf-8")
        assert "MIST LABIRINTO" in game_code


def test_download_quiz_game_zip(client):
    db = TestingSessionLocal()
    game = db.query(Game).filter(Game.title == "MIST Quiz").first()
    db.close()
    assert game is not None

    response = client.get(
        f"/games/{game.id}/download",
        headers={"X-User-Id": "7"}
    )
    assert response.status_code == 200

    zip_bytes = io.BytesIO(response.content)
    with zipfile.ZipFile(zip_bytes, "r") as zf:
        assert "game.py" in zf.namelist()
        game_code = zf.read("game.py").decode("utf-8")
        assert "MIST QUIZ" in game_code


def test_download_non_downloadable_game(client):
    # Jogo do catálogo que não tem game_file
    db = TestingSessionLocal()
    game = db.query(Game).filter(Game.game_file.is_(None)).first()
    db.close()
    assert game is not None

    response = client.get(
        f"/games/{game.id}/download",
        headers={"X-User-Id": "1"}
    )
    assert response.status_code == 400
    assert "não possui pacote" in response.json()["detail"].lower()


def test_download_nonexistent_game(client):
    response = client.get(
        "/games/99999/download",
        headers={"X-User-Id": "1"}
    )
    assert response.status_code == 404
