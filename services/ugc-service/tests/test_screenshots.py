import io
import os
import sys
from pathlib import Path

# Garante prioridade para os módulos do ugc-service
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base, get_db, UPLOADS_DIR
from app.models.screenshot import Screenshot, ScreenshotLike  # Registra os modelos no Base.metadata
from app.main import app

from sqlalchemy.pool import StaticPool

# Configuração de banco de dados em memória para testes unitários
TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_database():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def client():
    return TestClient(app)


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "ugc-service"}


def test_upload_screenshot_requires_auth(client):
    file_content = b"fake_png_data"
    response = client.post(
        "/screenshots/upload",
        files={"file": ("screenshot.png", io.BytesIO(file_content), "image/png")},
        data={"game_id": 11, "caption": "Test"},
    )
    assert response.status_code == 401
    assert "Autenticação obrigatória" in response.json()["detail"]


def test_upload_screenshot_invalid_extension(client):
    file_content = b"fake_exe_data"
    response = client.post(
        "/screenshots/upload",
        headers={"X-User-Id": "1"},
        files={"file": ("malicious.exe", io.BytesIO(file_content), "application/octet-stream")},
        data={"game_id": 11, "caption": "Test"},
    )
    assert response.status_code == 400
    assert "Formato de imagem não suportado" in response.json()["detail"]


def test_upload_screenshot_success(client):
    file_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"sample_png_bytes"
    response = client.post(
        "/screenshots/upload",
        headers={"X-User-Id": "1", "X-User-Name": "mkritli"},
        files={"file": ("boss_defeat.png", io.BytesIO(file_content), "image/png")},
        data={
            "game_id": 11,
            "title": "Vencendo Malenia",
            "caption": "Batalha épica no Elden Ring!",
            "game_title": "Elden Ring: Shadow of the Erdtree",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["user_id"] == 1
    assert data["username"] == "mkritli"
    assert data["game_id"] == 11
    assert data["game_title"] == "Elden Ring: Shadow of the Erdtree"
    assert data["title"] == "Vencendo Malenia"
    assert data["caption"] == "Batalha épica no Elden Ring!"
    assert data["likes_count"] == 0
    assert data["filename"].endswith(".png")

    # Verifica se o arquivo foi fisicamente salvo no diretório de uploads
    saved_path = os.path.join(UPLOADS_DIR, data["filename"])
    assert os.path.isfile(saved_path)
    with open(saved_path, "rb") as f:
        assert f.read() == file_content

    # Limpeza do arquivo de teste
    if os.path.isfile(saved_path):
        os.remove(saved_path)


def test_list_and_filter_screenshots(client):
    file_content = b"fake_png_image_content"

    # Upload da captura 1 (Jogo 11, Usuário 1)
    r1 = client.post(
        "/screenshots/upload",
        headers={"X-User-Id": "1", "X-User-Name": "mkritli"},
        files={"file": ("shot1.png", io.BytesIO(file_content), "image/png")},
        data={"game_id": 11, "caption": "Shot 1"},
    )
    assert r1.status_code == 201

    # Upload da captura 2 (Jogo 8, Usuário 2)
    r2 = client.post(
        "/screenshots/upload",
        headers={"X-User-Id": "2", "X-User-Name": "gabriel_t800"},
        files={"file": ("shot2.jpg", io.BytesIO(file_content), "image/jpeg")},
        data={"game_id": 8, "caption": "Shot 2"},
    )
    assert r2.status_code == 201

    # Listagem geral
    res_all = client.get("/screenshots")
    assert res_all.status_code == 200
    all_data = res_all.json()
    assert all_data["total"] == 2
    assert len(all_data["items"]) == 2

    # Filtro por jogo
    res_game11 = client.get("/screenshots?game_id=11")
    assert res_game11.status_code == 200
    game11_data = res_game11.json()
    assert game11_data["total"] == 1
    assert game11_data["items"][0]["game_id"] == 11

    # Filtro por usuário
    res_user2 = client.get("/screenshots?user_id=2")
    assert res_user2.status_code == 200
    user2_data = res_user2.json()
    assert user2_data["total"] == 1
    assert user2_data["items"][0]["user_id"] == 2


def test_like_and_unlike_screenshot(client):
    file_content = b"fake_png_for_likes"
    upload_res = client.post(
        "/screenshots/upload",
        headers={"X-User-Id": "1"},
        files={"file": ("like_test.png", io.BytesIO(file_content), "image/png")},
        data={"game_id": 10, "caption": "Silksong run"},
    )
    screenshot_id = upload_res.json()["id"]

    # Curtir captura (Usuário 2)
    like_res = client.post(
        f"/screenshots/{screenshot_id}/like",
        headers={"X-User-Id": "2"},
    )
    assert like_res.status_code == 200
    assert like_res.json()["liked"] is True
    assert like_res.json()["likes_count"] == 1

    # Curtir novamente pelo mesmo usuário (idempotência)
    like_again = client.post(
        f"/screenshots/{screenshot_id}/like",
        headers={"X-User-Id": "2"},
    )
    assert like_again.status_code == 200
    assert like_again.json()["likes_count"] == 1

    # Consulta com header de identidade para validar liked_by_me
    get_res = client.get(
        f"/screenshots/{screenshot_id}",
        headers={"X-User-Id": "2"},
    )
    assert get_res.status_code == 200
    assert get_res.json()["liked_by_me"] is True

    get_other_user = client.get(
        f"/screenshots/{screenshot_id}",
        headers={"X-User-Id": "3"},
    )
    assert get_other_user.json()["liked_by_me"] is False

    # Descurtir captura
    unlike_res = client.delete(
        f"/screenshots/{screenshot_id}/like",
        headers={"X-User-Id": "2"},
    )
    assert unlike_res.status_code == 200
    assert unlike_res.json()["liked"] is False
    assert unlike_res.json()["likes_count"] == 0


def test_delete_screenshot_authorization(client):
    file_content = b"screenshot_to_delete"
    upload_res = client.post(
        "/screenshots/upload",
        headers={"X-User-Id": "1"},
        files={"file": ("to_delete.png", io.BytesIO(file_content), "image/png")},
        data={"game_id": 13, "caption": "Delete me"},
    )
    screenshot_id = upload_res.json()["id"]

    # Tentativa de exclusão por usuário que não é o autor (403)
    del_forbidden = client.delete(
        f"/screenshots/{screenshot_id}",
        headers={"X-User-Id": "2"},
    )
    assert del_forbidden.status_code == 403

    # Exclusão pelo autor legítimo (204)
    del_ok = client.delete(
        f"/screenshots/{screenshot_id}",
        headers={"X-User-Id": "1"},
    )
    assert del_ok.status_code == 204

    # Confirmação de que não existe mais (404)
    get_del = client.get(f"/screenshots/{screenshot_id}")
    assert get_del.status_code == 404


def test_mist_sdk_take_screenshot_resilience(tmp_path, monkeypatch):
    import sys
    from pathlib import Path
    sdk_dir = Path(__file__).resolve().parent.parent.parent / "store-service" / "app" / "data"
    if str(sdk_dir) not in sys.path:
        sys.path.insert(0, str(sdk_dir))
    import mist_sdk

    monkeypatch.chdir(tmp_path)
    # Chama take_screenshot com host indisponível para validar salvamento local resiliente (N-02)
    res = mist_sdk.take_screenshot(caption="Teste Resiliente", ugc_api_url="http://invalid-ugc-server:9999")
    assert res is not None
    assert res.get("status") == "saved_locally"
    assert (tmp_path / "screenshots" / res["filename"]).is_file()
