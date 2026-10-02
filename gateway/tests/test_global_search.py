import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
import httpx
import sys
from pathlib import Path

GATEWAY_DIR = str(Path(__file__).resolve().parent.parent)
for mod in list(sys.modules.keys()):
    if mod == "app" or mod.startswith("app."):
        del sys.modules[mod]
if GATEWAY_DIR in sys.path:
    sys.path.remove(GATEWAY_DIR)
sys.path.insert(0, GATEWAY_DIR)

from app.main import app
import app.main as gateway_main


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_global_search_empty_query(client):
    response = client.get("/api/search?q=")
    assert response.status_code == 200
    data = response.json()
    assert data["query"] == ""
    assert data["total"] == 0
    assert data["games"] == []
    assert data["users"] == []
    assert data["groups"] == []
    assert data["market_items"] == []


def test_global_search_aggregates_all_services(client):
    mock_games = [{"id": 1, "title": "Elden Ring", "price": 199.9}]
    mock_users = [{"id": 2, "username": "elden_master", "email": "elden@mist.com"}]
    mock_groups = [{"id": 1, "name": "RPG Brasil & Souls Enthusiasts", "members_count": 4}]
    mock_market = {"items": [{"id": 10, "item_name": "Elden Ring Foil Card", "price": 12.5}]}

    async def mock_get(url, *args, **kwargs):
        req = httpx.Request("GET", url)
        if "/games" in url:
            return httpx.Response(200, json=mock_games, request=req)
        elif "/users/search" in url:
            return httpx.Response(200, json=mock_users, request=req)
        elif "/groups" in url:
            return httpx.Response(200, json=mock_groups, request=req)
        elif "/market/listings" in url:
            return httpx.Response(200, json=mock_market, request=req)
        return httpx.Response(404, request=req)

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=mock_get)

    with patch.object(gateway_main, "http_client", mock_client):
        response = client.get("/api/search?q=elden&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert data["query"] == "elden"
        assert len(data["games"]) == 1
        assert len(data["users"]) == 1
        assert len(data["groups"]) == 1
        assert len(data["market_items"]) == 1
        assert data["total"] == 4


def test_global_search_graceful_degradation_when_service_fails(client):
    """
    Se um microsserviço (como o market-service) cair ou lançar exceção,
    o Gateway não deve falhar com 500, e sim responder 200 com degradação graciosa.
    """
    mock_games = [{"id": 1, "title": "CS2", "price": 0.0}]

    async def mock_get(url, *args, **kwargs):
        req = httpx.Request("GET", url)
        if "/games" in url:
            return httpx.Response(200, json=mock_games, request=req)
        elif "/market/listings" in url:
            raise httpx.ConnectError("Connection refused to market-service")
        elif "/users/search" in url:
            return httpx.Response(500, json={"detail": "Database error"}, request=req)
        elif "/groups" in url:
            return httpx.Response(200, json=[], request=req)
        return httpx.Response(404, request=req)

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=mock_get)

    with patch.object(gateway_main, "http_client", mock_client):
        response = client.get("/api/search?q=cs2")
        assert response.status_code == 200
        data = response.json()
        assert data["query"] == "cs2"
        assert len(data["games"]) == 1
        assert data["users"] == []
        assert data["groups"] == []
        assert data["market_items"] == []
        assert data["total"] == 1
