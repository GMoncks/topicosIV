import io
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from sqlalchemy.pool import StaticPool

from app.db.database import Base, get_db, UPLOADS_DIR
from app.models.workshop import WorkshopItem, WorkshopSubscription  # noqa
from app.main import app

TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_database():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client



def test_upload_workshop_item_success(client):
    """O-01, O-02: Upload de mod .zip com metadados e autoria."""
    mod_file = io.BytesIO(b"fake_zip_mod_content_data")
    preview_file = io.BytesIO(b"\x89PNG\r\n\x1a\nfake_preview")

    response = client.post(
        "/workshop/items",
        headers={"X-User-Id": "1", "X-User-Name": "mkritli"},
        data={
            "game_id": 11,
            "game_title": "Elden Ring: Shadow of the Erdtree",
            "title": "Seamless Co-op Reforged",
            "category": "Mod",
            "tags": "Multiplayer, Co-op, Gameplay",
            "description": "Jogue a campanha inteira com amigos sem desconexões.",
            "version": "1.2.0",
        },
        files={
            "file": ("elden_ring_coop.zip", mod_file, "application/zip"),
            "preview_file": ("preview.png", preview_file, "image/png"),
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["title"] == "Seamless Co-op Reforged"
    assert data["author_id"] == 1
    assert data["author_name"] == "mkritli"
    assert data["game_id"] == 11
    assert data["category"] == "Mod"
    assert "Multiplayer" in data["tags"]
    assert data["file_url"].startswith("/api/ugc/uploads/")
    assert data["preview_url"].startswith("/api/ugc/uploads/")
    assert data["subscriptions_count"] == 0
    assert data["downloads_count"] == 0


def test_upload_workshop_item_unauthorized(client):
    """O-02: Bloqueia 401 para upload sem autenticação."""
    mod_file = io.BytesIO(b"zip_content")
    response = client.post(
        "/workshop/items",
        data={"game_id": 1, "title": "Test Mod"},
        files={"file": ("test.zip", mod_file, "application/zip")},
    )
    assert response.status_code == 401


def test_upload_workshop_item_invalid_extension(client):
    """O-02: Bloqueia extensões executáveis perigosas (.exe)."""
    exe_file = io.BytesIO(b"malicious_executable_content")
    response = client.post(
        "/workshop/items",
        headers={"X-User-Id": "1", "X-User-Name": "mkritli"},
        data={"game_id": 1, "title": "Dangerous Mod"},
        files={"file": ("virus.exe", exe_file, "application/octet-stream")},
    )
    assert response.status_code == 400
    assert "não suportada" in response.json()["detail"]


def test_list_workshop_items_and_search(client):
    """O-03: Listagem de itens com filtros por jogo, categoria e busca textual."""
    # Cria dois itens
    f1 = io.BytesIO(b"mod1")
    client.post(
        "/workshop/items",
        headers={"X-User-Id": "1", "X-User-Name": "mkritli"},
        data={
            "game_id": 11,
            "title": "Boss Rush Elden",
            "category": "Mod",
            "tags": "Combat, Bosses",
            "description": "Lute com todos os chefes consecutivamente",
        },
        files={"file": ("boss_rush.zip", f1, "application/zip")},
    )

    f2 = io.BytesIO(b"mod2")
    client.post(
        "/workshop/items",
        headers={"X-User-Id": "2", "X-User-Name": "gabriel_t800"},
        data={
            "game_id": 8,
            "title": "Geralt HD Reworked Skin",
            "category": "Skin",
            "tags": "Graphics, 4K",
            "description": "Texturas em altíssima resolução para armaduras",
        },
        files={"file": ("geralt_hd.pak", f2, "application/octet-stream")},
    )

    # Listagem sem filtros
    resp = client.get("/workshop/items")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2

    # Filtro por jogo
    resp_game = client.get("/workshop/items?game_id=11")
    assert resp_game.status_code == 200
    assert resp_game.json()["total"] == 1
    assert resp_game.json()["items"][0]["title"] == "Boss Rush Elden"

    # Filtro por categoria
    resp_cat = client.get("/workshop/items?category=Skin")
    assert resp_cat.status_code == 200
    assert resp_cat.json()["total"] == 1
    assert resp_cat.json()["items"][0]["title"] == "Geralt HD Reworked Skin"

    # Busca textual
    resp_search = client.get("/workshop/items?search=armaduras")
    assert resp_search.status_code == 200
    assert resp_search.json()["total"] == 1
    assert resp_search.json()["items"][0]["author_name"] == "gabriel_t800"


def test_subscribe_and_unsubscribe_workshop_item(client):
    """O-04: Inscrição e desinscrição idempotente de mod."""
    f = io.BytesIO(b"content")
    create_resp = client.post(
        "/workshop/items",
        headers={"X-User-Id": "1", "X-User-Name": "mkritli"},
        data={"game_id": 11, "title": "HUD Minimalista"},
        files={"file": ("hud.zip", f, "application/zip")},
    )
    item_id = create_resp.json()["id"]

    # Usuário 2 se inscreve
    sub_resp = client.post(
        f"/workshop/items/{item_id}/subscribe",
        headers={"X-User-Id": "2"},
    )
    assert sub_resp.status_code == 200
    assert sub_resp.json()["subscribed"] is True
    assert sub_resp.json()["subscriptions_count"] == 1

    # Checa detalhes passando X-User-Id: 2
    detail_resp = client.get(
        f"/workshop/items/{item_id}",
        headers={"X-User-Id": "2"},
    )
    assert detail_resp.status_code == 200
    assert detail_resp.json()["is_subscribed"] is True
    assert detail_resp.json()["subscriptions_count"] == 1

    # Usuário 2 desinscreve
    unsub_resp = client.delete(
        f"/workshop/items/{item_id}/subscribe",
        headers={"X-User-Id": "2"},
    )
    assert unsub_resp.status_code == 200
    assert unsub_resp.json()["subscribed"] is False
    assert unsub_resp.json()["subscriptions_count"] == 0


def test_increment_mod_download(client):
    """O-03: Incremento e recuperação de download de mod."""
    f = io.BytesIO(b"content")
    create_resp = client.post(
        "/workshop/items",
        headers={"X-User-Id": "1"},
        data={"game_id": 11, "title": "Mod Download Test"},
        files={"file": ("test_dl.zip", f, "application/zip")},
    )
    item_id = create_resp.json()["id"]

    dl_resp = client.post(f"/workshop/items/{item_id}/download")
    assert dl_resp.status_code == 200
    assert dl_resp.json()["downloads_count"] == 1
    assert dl_resp.json()["file_url"].startswith("/api/ugc/uploads/")


def test_delete_workshop_item_author_only(client):
    """O-01: Apenas o autor do mod pode excluí-lo."""
    f = io.BytesIO(b"content")
    create_resp = client.post(
        "/workshop/items",
        headers={"X-User-Id": "1"},
        data={"game_id": 11, "title": "Mod To Delete"},
        files={"file": ("del.zip", f, "application/zip")},
    )
    item_id = create_resp.json()["id"]

    # Tentativa com outro usuário (retorna 403)
    del_forbidden = client.delete(
        f"/workshop/items/{item_id}",
        headers={"X-User-Id": "2"},
    )
    assert del_forbidden.status_code == 403

    # Exclusão pelo autor legítimo (retorna 204)
    del_ok = client.delete(
        f"/workshop/items/{item_id}",
        headers={"X-User-Id": "1"},
    )
    assert del_ok.status_code == 204

    # Confirmação de que não existe mais (retorna 404)
    get_gone = client.get(f"/workshop/items/{item_id}")
    assert get_gone.status_code == 404
