import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

MARKET_DIR = str(Path(__file__).resolve().parent.parent)
for mod in list(sys.modules.keys()):
    if mod == "app" or mod.startswith("app."):
        del sys.modules[mod]
if MARKET_DIR in sys.path:
    sys.path.remove(MARKET_DIR)
sys.path.insert(0, MARKET_DIR)

from app.main import app
from app.db.database import Base, get_db
from app.models.listing import MarketListing

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
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
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def inventory_mock(lock_status=200, unlock_status=200):
    """Simula o auth-service respondendo lock/unlock de itens do inventário."""
    mock_client = AsyncMock(spec=httpx.AsyncClient)

    async def mock_post(url, json=None, *args, **kwargs):
        if "/lock" in str(url):
            return httpx.Response(lock_status, json={"id": json.get("user_id"), "is_locked": True})
        if "/unlock" in str(url):
            return httpx.Response(unlock_status, json={"is_locked": False})
        return httpx.Response(404)

    mock_client.post = mock_post
    return mock_client


def create_listing(client, seller_id=10, item_id=1, item_type="card", price=25.0, **inventory):
    with patch("httpx.AsyncClient", return_value=inventory_mock(**inventory)):
        return client.post(
            "/market/list",
            json={"item_id": item_id, "item_type": item_type, "item_name": "Carta Rara", "price": price},
            headers={"X-User-Id": str(seller_id)},
        )


# ----------------------------- POST /market/list -----------------------------

def test_create_listing_requires_authentication(client):
    resp = client.post("/market/list", json={"item_id": 1, "item_type": "card", "price": 10.0})
    assert resp.status_code == 401


@pytest.mark.parametrize("payload", [
    {"item_id": 1, "item_type": "moeda", "price": 10.0},
    {"item_id": 1, "item_type": "card", "price": 0},
    {"item_id": 1, "item_type": "card", "price": -5},
])
def test_create_listing_rejects_invalid_payload(client, payload):
    resp = client.post("/market/list", json=payload, headers={"X-User-Id": "10"})
    assert resp.status_code == 422


def test_create_listing_success_locks_item_and_persists(client):
    resp = create_listing(client)
    assert resp.status_code == 201
    data = resp.json()
    assert data["seller_id"] == 10
    assert data["item_id"] == 1
    assert data["status"] == "ativo"
    assert data["price"] == 25.0

    db = TestingSessionLocal()
    assert db.query(MarketListing).count() == 1
    db.close()


@pytest.mark.parametrize("lock_status,expected_status", [
    (404, 404),
    (403, 403),
    (409, 409),
])
def test_create_listing_propagates_inventory_validation_errors(client, lock_status, expected_status):
    resp = create_listing(client, lock_status=lock_status)
    assert resp.status_code == expected_status

    db = TestingSessionLocal()
    assert db.query(MarketListing).count() == 0
    db.close()


def test_create_listing_fails_closed_when_auth_service_unavailable(client):
    mock_client = AsyncMock(spec=httpx.AsyncClient)

    async def mock_post(url, *args, **kwargs):
        raise httpx.ConnectError("auth-service fora do ar")

    mock_client.post = mock_post

    with patch("httpx.AsyncClient", return_value=mock_client):
        resp = client.post(
            "/market/list",
            json={"item_id": 1, "item_type": "card", "price": 10.0},
            headers={"X-User-Id": "10"},
        )
    assert resp.status_code == 503

    db = TestingSessionLocal()
    assert db.query(MarketListing).count() == 0
    db.close()


# ----------------------------- GET /market/listings -----------------------------

def test_list_listings_only_shows_active_sorted_by_price(client):
    create_listing(client, item_id=1, price=50.0)
    create_listing(client, item_id=2, price=10.0)
    create_listing(client, item_id=3, price=30.0)

    resp = client.get("/market/listings")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3
    assert [item["price"] for item in data["items"]] == [10.0, 30.0, 50.0]


def test_list_listings_filters_by_type_and_game(client):
    create_listing(client, item_id=1, item_type="card", price=10.0)
    create_listing(client, item_id=2, item_type="emoticon", price=5.0)

    resp = client.get("/market/listings", params={"item_type": "card"})
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["item_type"] == "card"


def test_list_listings_rejects_unknown_type(client):
    resp = client.get("/market/listings", params={"item_type": "moeda"})
    assert resp.status_code == 400


def test_list_listings_excludes_sold_and_cancelled(client):
    create_listing(client, item_id=1, price=10.0)
    create_listing(client, item_id=2, price=20.0)

    with patch("httpx.AsyncClient", return_value=inventory_mock()):
        client.post("/market/listings/2/cancel", headers={"X-User-Id": "10"})

    resp = client.get("/market/listings")
    assert resp.json()["total"] == 1


# ----------------------------- GET /market/my-listings -----------------------------

def test_my_listings_requires_authentication(client):
    assert client.get("/market/my-listings").status_code == 401


def test_my_listings_only_returns_own_listings(client):
    create_listing(client, seller_id=10, item_id=1)
    create_listing(client, seller_id=20, item_id=2)

    resp = client.get("/market/my-listings", headers={"X-User-Id": "10"})
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["seller_id"] == 10


def test_my_listings_filters_by_status(client):
    create_listing(client, seller_id=10, item_id=1)
    create_listing(client, seller_id=10, item_id=2)
    with patch("httpx.AsyncClient", return_value=inventory_mock()):
        client.post("/market/listings/1/cancel", headers={"X-User-Id": "10"})

    resp = client.get("/market/my-listings", params={"status": "cancelado"}, headers={"X-User-Id": "10"})
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["item_id"] == 1


# ----------------------------- POST /market/listings/{id}/cancel -----------------------------

def test_cancel_listing_requires_authentication(client):
    assert client.post("/market/listings/1/cancel").status_code == 401


def test_cancel_listing_unknown_is_404(client):
    resp = client.post("/market/listings/999/cancel", headers={"X-User-Id": "10"})
    assert resp.status_code == 404


def test_cancel_listing_blocks_other_users(client):
    create_listing(client, seller_id=10, item_id=1)
    with patch("httpx.AsyncClient", return_value=inventory_mock()):
        resp = client.post("/market/listings/1/cancel", headers={"X-User-Id": "99"})
    assert resp.status_code == 403


def test_cancel_listing_unlocks_item_and_updates_status(client):
    create_listing(client, seller_id=10, item_id=1)

    unlock_calls = []
    mock_client = AsyncMock(spec=httpx.AsyncClient)

    async def mock_post(url, json=None, *args, **kwargs):
        if "/unlock" in str(url):
            unlock_calls.append(json)
            return httpx.Response(200, json={"is_locked": False})
        return httpx.Response(404)

    mock_client.post = mock_post

    with patch("httpx.AsyncClient", return_value=mock_client):
        resp = client.post("/market/listings/1/cancel", headers={"X-User-Id": "10"})

    assert resp.status_code == 200
    assert resp.json()["status"] == "cancelado"
    assert unlock_calls == [{"user_id": 10}]


def test_cancel_listing_rejects_already_sold(client):
    create_listing(client, seller_id=10, item_id=1)
    db = TestingSessionLocal()
    listing = db.query(MarketListing).first()
    listing.status = "vendido"
    db.commit()
    db.close()

    with patch("httpx.AsyncClient", return_value=inventory_mock()):
        resp = client.post("/market/listings/1/cancel", headers={"X-User-Id": "10"})
    assert resp.status_code == 409
