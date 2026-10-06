import pytest
import jwt
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
import httpx
import os
import sys
from pathlib import Path

GATEWAY_DIR = str(Path(__file__).resolve().parent.parent)
for mod in list(sys.modules.keys()):
    if mod == "app" or mod.startswith("app."):
        del sys.modules[mod]
if GATEWAY_DIR in sys.path:
    sys.path.remove(GATEWAY_DIR)
sys.path.insert(0, GATEWAY_DIR)

import app.main as gateway_main
from app.main import app
from app.config import JWT_SECRET_KEY, JWT_ALGORITHM


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.mark.unit
def test_ugc_proxy_allows_public_screenshots_list(client):
    """Permite listagem pública de screenshots mesmo sem JWT."""
    mock_response = httpx.Response(
        200,
        json={"items": [], "total": 0, "page": 1, "size": 20, "pages": 0},
        headers={"content-type": "application/json"}
    )
    with patch.object(gateway_main.http_client, "request", new_callable=AsyncMock) as mock_req:
        mock_req.return_value = mock_response
        resp = client.get("/api/ugc/screenshots?game_id=1")
        assert resp.status_code == 200
        assert resp.json()["total"] == 0
        mock_req.assert_called_once()


@pytest.mark.unit
def test_ugc_proxy_blocks_upload_without_token(client):
    """Barra upload de captura sem token com 401."""
    resp = client.post("/api/ugc/screenshots/upload")
    assert resp.status_code == 401
    assert "Token de autenticação ausente ou inválido" in resp.json()["detail"]


@pytest.mark.unit
def test_ugc_proxy_injects_user_headers_and_strips_spoofing(client):
    """Injeta X-User-Id e X-User-Name confiáveis e remove cabeçalhos externos spoofados."""
    token = jwt.encode({"sub": "42", "username": "pro_gamer"}, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    mock_response = httpx.Response(
        201,
        json={"id": 1, "user_id": 42, "user_name": "pro_gamer", "caption": "Epic Win"},
        headers={"content-type": "application/json"}
    )

    with patch.object(gateway_main.http_client, "request", new_callable=AsyncMock) as mock_req:
        mock_req.return_value = mock_response
        resp = client.post(
            "/api/ugc/screenshots/upload",
            headers={
                "Authorization": f"Bearer {token}",
                "X-User-Id": "9999",  # Tentativa de spoofing
                "X-User-Name": "impostor"
            }
        )
        assert resp.status_code == 201
        called_headers = mock_req.call_args.kwargs["headers"]
        assert called_headers.get("X-User-Id") == "42"
        assert called_headers.get("X-User-Name") == "pro_gamer"


@pytest.mark.unit
def test_ugc_proxy_like_requires_token(client):
    """Bloqueia curtida sem autenticação com 401."""
    resp = client.post("/api/ugc/screenshots/1/like")
    assert resp.status_code == 401


@pytest.mark.unit
def test_ugc_proxy_handles_upstream_failure(client):
    """Retorna 503 quando o UGC service está inacessível."""
    token = jwt.encode({"sub": "42"}, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    with patch.object(gateway_main.http_client, "request", side_effect=httpx.ConnectError("Connection refused")):
        resp = client.post(
            "/api/ugc/screenshots/1/like",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 503
        assert "temporariamente indisponível" in resp.json()["detail"]


@pytest.mark.unit
def test_ugc_proxy_allows_public_workshop_items_list(client):
    """Permite listagem pública de mods do workshop sem JWT."""
    mock_response = httpx.Response(
        200,
        json={"items": [], "total": 0, "page": 1, "size": 20, "pages": 1},
        headers={"content-type": "application/json"}
    )
    with patch.object(gateway_main.http_client, "request", new_callable=AsyncMock) as mock_req:
        mock_req.return_value = mock_response
        resp = client.get("/api/ugc/workshop/items?game_id=11")
        assert resp.status_code == 200
        assert resp.json()["total"] == 0
        mock_req.assert_called_once()


@pytest.mark.unit
def test_ugc_proxy_blocks_workshop_upload_without_token(client):
    """Bloqueia upload de mod no workshop sem autenticação com 401."""
    resp = client.post("/api/ugc/workshop/items")
    assert resp.status_code == 401


@pytest.mark.unit
def test_ugc_proxy_blocks_workshop_subscribe_without_token(client):
    """Bloqueia subscrição em mod do workshop sem autenticação com 401."""
    resp = client.post("/api/ugc/workshop/items/1/subscribe")
    assert resp.status_code == 401

