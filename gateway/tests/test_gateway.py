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
def test_gateway_health(client):
    """Valida o healthcheck próprio do API Gateway."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "api-gateway"}


@pytest.mark.integration
def test_gateway_blocks_protected_route_without_token(client):
    """Valida que o Gateway barra rotas protegidas sem token com 401."""
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert "Token de autenticação ausente ou inválido" in response.json()["detail"]


@pytest.mark.integration
def test_gateway_blocks_protected_route_with_invalid_token(client):
    """Valida que o Gateway barra rotas protegidas com token inválido com 401."""
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer token_falsificado"})
    assert response.status_code == 401
    assert "Token de autenticação ausente ou inválido" in response.json()["detail"]


@pytest.mark.integration
def test_gateway_strips_spoofed_x_user_headers_and_injects_trusted_identity(client):
    """
    Valida que o Gateway remove cabeçalhos X-User-* fraudulentos enviados externamente
    e injeta os cabeçalhos verdadeiros a partir da decodificação do JWT.
    """
    valid_payload = {"sub": "101", "username": "gamer_legitimo", "email": "legit@mist.com"}
    token = jwt.encode(valid_payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

    mock_resp = httpx.Response(
        status_code=200,
        json={"id": 101, "username": "gamer_legitimo", "wallet_balance": 200.0},
        headers={"content-type": "application/json"}
    )

    captured_request = {}

    async def mock_request(method, url, headers=None, **kwargs):
        captured_request["method"] = method
        captured_request["url"] = str(url)
        captured_request["headers"] = headers
        return mock_resp

    with patch.object(gateway_main.http_client, "request", new=AsyncMock(side_effect=mock_request)):
        response = client.get(
            "/api/auth/me",
            headers={
                "Authorization": f"Bearer {token}",
                "X-User-Id": "999",  # Tentativa de spoofing externo
                "X-User-Role": "admin"
            }
        )

        assert response.status_code == 200
        # O header injetado no upstream DEVE ser o ID real do payload (101), não 999
        sent_headers = captured_request["headers"]
        assert sent_headers.get("X-User-Id") == "101"
        assert sent_headers.get("X-User-Email") == "legit@mist.com"
        assert sent_headers.get("X-User-Username") == "gamer_legitimo"
        assert "X-User-Role" not in sent_headers


@pytest.mark.integration
def test_gateway_public_route_passthrough(client):
    """Valida que rotas públicas como /register repassam transparentemente."""
    mock_resp = httpx.Response(
        status_code=201,
        json={"access_token": "mock_token", "token_type": "bearer"},
        headers={"content-type": "application/json"}
    )

    async def mock_request(method, url, **kwargs):
        return mock_resp

    with patch.object(gateway_main.http_client, "request", new=AsyncMock(side_effect=mock_request)):
        response = client.post(
            "/api/auth/register",
            json={"username": "novo_user", "email": "novo@mist.com", "password": "123"}
        )
        assert response.status_code == 201
        assert response.json()["access_token"] == "mock_token"


@pytest.mark.integration
def test_gateway_store_games_proxy_passthrough(client):
    """GATEWAY-INT-02: Valida encaminhamento de consulta do catálogo da Store via Gateway."""
    mock_resp = httpx.Response(
        status_code=200,
        json=[{"id": 1, "title": "Orbitals", "price": 90.0}],
        headers={"content-type": "application/json"}
    )

    captured_url = []

    async def mock_request(method, url, **kwargs):
        captured_url.append(str(url))
        return mock_resp

    with patch.object(gateway_main.http_client, "request", new=AsyncMock(side_effect=mock_request)):
        response = client.get("/api/games?category=Simulação")
        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["title"] == "Orbitals"
        assert len(captured_url) == 1
        assert "/games" in captured_url[0]


@pytest.mark.integration
def test_gateway_library_my_games_proxy(client):
    """GATEWAY-INT-03: Valida autenticação centralizada e injeção de X-User-Id no proxy da Library."""
    # 1. Sem token JWT -> 401 Unauthorized
    res_no_token = client.get("/api/library/my-games")
    assert res_no_token.status_code == 401

    # 2. Com token JWT válido -> Encaminha com X-User-Id
    token = jwt.encode({"sub": "42", "username": "gamer42"}, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    mock_resp = httpx.Response(
        status_code=200,
        json=[{"id": 1, "user_id": 42, "game_id": 10, "playtime_minutes": 120}],
        headers={"content-type": "application/json"}
    )

    captured_headers = {}

    async def mock_request(method, url, **kwargs):
        captured_headers.update(kwargs.get("headers", {}))
        return mock_resp

    with patch.object(gateway_main.http_client, "request", new=AsyncMock(side_effect=mock_request)):
        response = client.get("/api/library/my-games", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert response.json()[0]["user_id"] == 42
        assert captured_headers.get("X-User-Id") == "42"


