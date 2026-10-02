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
from app.models.trade import TradeOffer

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


def inventory_mock(lock_status=200, unlock_status=200, transfer_status=200):
    mock_client = AsyncMock(spec=httpx.AsyncClient)
    calls = {"lock": [], "unlock": [], "transfer": []}

    async def mock_post(url, json=None, *args, **kwargs):
        url = str(url)
        if "/lock" in url:
            calls["lock"].append(json)
            return httpx.Response(lock_status, json={"is_locked": True})
        if "/unlock" in url:
            calls["unlock"].append(json)
            return httpx.Response(unlock_status, json={"is_locked": False})
        if "/inventory/transfer" in url:
            calls["transfer"].append(json)
            return httpx.Response(transfer_status)
        return httpx.Response(404)

    mock_client.post = mock_post
    return mock_client, calls


OFFERED = [{"item_id": 1, "item_type": "card", "item_name": "Carta A"}]
REQUESTED = [{"item_id": 2, "item_type": "emoticon", "item_name": "Emoticon B"}]


def create_offer(client, sender_id=10, receiver_id=20, offered=None, requested=None, **inventory):
    mock_client, calls = inventory_mock(**inventory)
    with patch("httpx.AsyncClient", return_value=mock_client):
        resp = client.post(
            "/trades/offer",
            json={
                "receiver_id": receiver_id,
                "offered_items": offered or OFFERED,
                "requested_items": requested or REQUESTED,
            },
            headers={"X-User-Id": str(sender_id)},
        )
    return resp, calls


# ----------------------------- POST /trades/offer -----------------------------

def test_create_offer_requires_authentication(client):
    resp = client.post("/trades/offer", json={"receiver_id": 20, "offered_items": OFFERED, "requested_items": REQUESTED})
    assert resp.status_code == 401


def test_create_offer_rejects_self_trade(client):
    resp, calls = create_offer(client, sender_id=10, receiver_id=10)
    assert resp.status_code == 400
    assert calls["lock"] == []


@pytest.mark.parametrize("payload_extra", [
    {"offered_items": []},
    {"requested_items": []},
])
def test_create_offer_requires_at_least_one_item_each_side(client, payload_extra):
    resp = client.post(
        "/trades/offer",
        json={"receiver_id": 20, "offered_items": OFFERED, "requested_items": REQUESTED, **payload_extra},
        headers={"X-User-Id": "10"},
    )
    assert resp.status_code == 422


def test_create_offer_locks_only_offered_items(client):
    resp, calls = create_offer(client)
    assert resp.status_code == 201
    data = resp.json()
    assert data["sender_id"] == 10
    assert data["receiver_id"] == 20
    assert data["status"] == "pending"
    assert data["offered_items"] == OFFERED
    assert data["requested_items"] == REQUESTED

    # só o item ofertado (do remetente) é bloqueado na criação
    assert calls["lock"] == [{"user_id": 10}]

    db = TestingSessionLocal()
    assert db.query(TradeOffer).count() == 1
    db.close()


@pytest.mark.parametrize("lock_status,expected_status", [(404, 404), (403, 403), (409, 409)])
def test_create_offer_propagates_inventory_validation_errors(client, lock_status, expected_status):
    resp, calls = create_offer(client, lock_status=lock_status)
    assert resp.status_code == expected_status

    db = TestingSessionLocal()
    assert db.query(TradeOffer).count() == 0
    db.close()


# ----------------------------- GET /trades/received e /trades/sent -----------------------------

def test_list_received_and_sent_offers(client):
    create_offer(client, sender_id=10, receiver_id=20)
    create_offer(client, sender_id=10, receiver_id=30)

    received = client.get("/trades/received", headers={"X-User-Id": "20"})
    assert received.json()["total"] == 1
    assert received.json()["items"][0]["sender_id"] == 10

    sent = client.get("/trades/sent", headers={"X-User-Id": "10"})
    assert sent.json()["total"] == 2


def test_list_offers_requires_authentication(client):
    assert client.get("/trades/received").status_code == 401
    assert client.get("/trades/sent").status_code == 401


def test_list_offers_filters_by_status(client):
    create_offer(client, sender_id=10, receiver_id=20)
    with patch("httpx.AsyncClient", return_value=inventory_mock()[0]):
        client.post("/trades/1/decline", headers={"X-User-Id": "20"})

    pending = client.get("/trades/received", params={"status": "pending"}, headers={"X-User-Id": "20"})
    declined = client.get("/trades/received", params={"status": "declined"}, headers={"X-User-Id": "20"})
    assert pending.json()["total"] == 0
    assert declined.json()["total"] == 1


def test_list_offers_rejects_unknown_status(client):
    resp = client.get("/trades/received", params={"status": "cancelado"}, headers={"X-User-Id": "20"})
    assert resp.status_code == 400


# ----------------------------- POST /trades/{id}/decline -----------------------------

def test_decline_requires_receiver(client):
    create_offer(client, sender_id=10, receiver_id=20)
    with patch("httpx.AsyncClient", return_value=inventory_mock()[0]):
        resp = client.post("/trades/1/decline", headers={"X-User-Id": "99"})
    assert resp.status_code == 403


def test_decline_unlocks_offered_items(client):
    create_offer(client, sender_id=10, receiver_id=20)
    mock_client, calls = inventory_mock()

    with patch("httpx.AsyncClient", return_value=mock_client):
        resp = client.post("/trades/1/decline", headers={"X-User-Id": "20"})

    assert resp.status_code == 200
    assert resp.json()["status"] == "declined"
    assert calls["unlock"] == [{"user_id": 10}]


def test_decline_already_responded_is_409(client):
    create_offer(client, sender_id=10, receiver_id=20)
    with patch("httpx.AsyncClient", return_value=inventory_mock()[0]):
        client.post("/trades/1/decline", headers={"X-User-Id": "20"})
        resp = client.post("/trades/1/decline", headers={"X-User-Id": "20"})
    assert resp.status_code == 409


# ----------------------------- POST /trades/{id}/accept -----------------------------

def test_accept_requires_receiver(client):
    create_offer(client, sender_id=10, receiver_id=20)
    with patch("httpx.AsyncClient", return_value=inventory_mock()[0]):
        resp = client.post("/trades/1/accept", headers={"X-User-Id": "99"})
    assert resp.status_code == 403


def test_accept_success_locks_requested_items_and_transfers_both_ways(client):
    create_offer(client, sender_id=10, receiver_id=20)
    mock_client, calls = inventory_mock()

    with patch("httpx.AsyncClient", return_value=mock_client):
        resp = client.post("/trades/1/accept", headers={"X-User-Id": "20"})

    assert resp.status_code == 200
    assert resp.json()["status"] == "accepted"

    # bloqueia o item solicitado (do destinatário) só agora, no aceite
    assert calls["lock"] == [{"user_id": 20}]
    # oferecido (item 1) vai de sender(10) -> receiver(20); solicitado (item 2) vai de receiver(20) -> sender(10)
    assert calls["transfer"] == [
        {"item_id": 1, "from_user_id": 10, "to_user_id": 20},
        {"item_id": 2, "from_user_id": 20, "to_user_id": 10},
    ]

    db = TestingSessionLocal()
    offer = db.query(TradeOffer).first()
    assert offer.status == "accepted"
    assert offer.responded_at is not None
    db.close()


def test_accept_fails_when_requested_item_validation_fails(client):
    create_offer(client, sender_id=10, receiver_id=20)

    with patch("httpx.AsyncClient", return_value=inventory_mock(lock_status=403)[0]):
        resp = client.post("/trades/1/accept", headers={"X-User-Id": "20"})
    assert resp.status_code == 403

    db = TestingSessionLocal()
    assert db.query(TradeOffer).first().status == "pending"
    db.close()


def test_accept_rolls_back_completed_transfer_if_second_transfer_fails(client):
    """O item 1 (ofertado) é transferido com sucesso; o item 2 (solicitado) falha
    ao transferir — a troca deve reverter o item 1 de volta ao remetente."""
    create_offer(client, sender_id=10, receiver_id=20)

    mock_client = AsyncMock(spec=httpx.AsyncClient)
    transfer_calls = []

    async def mock_post(url, json=None, *args, **kwargs):
        url = str(url)
        if "/lock" in url:
            return httpx.Response(200, json={"is_locked": True})
        if "/inventory/transfer" in url:
            transfer_calls.append(json)
            # A transferência do item 2 (solicitado) falha; a do item 1 (ofertado) funciona.
            return httpx.Response(500 if json["item_id"] == 2 else 200)
        return httpx.Response(404)

    mock_client.post = mock_post

    with patch("httpx.AsyncClient", return_value=mock_client):
        resp = client.post("/trades/1/accept", headers={"X-User-Id": "20"})

    assert resp.status_code == 502
    assert transfer_calls == [
        {"item_id": 1, "from_user_id": 10, "to_user_id": 20},  # sucesso
        {"item_id": 2, "from_user_id": 20, "to_user_id": 10},  # falha
        {"item_id": 1, "from_user_id": 20, "to_user_id": 10},  # rollback: devolve o item 1 ao remetente
    ]

    db = TestingSessionLocal()
    assert db.query(TradeOffer).first().status == "pending"
    db.close()
