import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

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
from app.models.transaction import WalletTransaction
from app.services.wallet_ledger import WalletLedger

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


def create_transaction(client, user_id=10, type="compra", amount=50.0, description="Compra de teste"):
    return client.post(
        "/wallet/transactions",
        json={"user_id": user_id, "type": type, "amount": amount, "description": description},
    )


# ----------------------------- POST /wallet/transactions -----------------------------

def test_record_transaction_creates_entry(client):
    resp = create_transaction(client)
    assert resp.status_code == 201
    data = resp.json()
    assert data["user_id"] == 10
    assert data["type"] == "compra"
    assert data["amount"] == 50.0
    assert data["direction"] == "debit"
    assert data["description"] == "Compra de teste"

    db = TestingSessionLocal()
    assert db.query(WalletTransaction).count() == 1
    db.close()


@pytest.mark.parametrize("type,expected_direction", [
    ("compra", "debit"),
    ("venda", "credit"),
    ("recarga", "credit"),
    ("resgate", "credit"),
])
def test_record_transaction_direction_by_type(client, type, expected_direction):
    resp = create_transaction(client, type=type)
    assert resp.status_code == 201
    assert resp.json()["direction"] == expected_direction


def test_record_transaction_rejects_unknown_type(client):
    resp = create_transaction(client, type="saque")
    assert resp.status_code == 422


@pytest.mark.parametrize("amount", [0, -10])
def test_record_transaction_rejects_non_positive_amount(client, amount):
    resp = create_transaction(client, amount=amount)
    assert resp.status_code == 422


def test_record_transaction_rejects_blank_description(client):
    resp = create_transaction(client, description="   ")
    assert resp.status_code == 422


def test_record_transaction_does_not_require_authentication_header(client):
    """Endpoint interno: chamado service-to-service, sem X-User-Id."""
    resp = client.post(
        "/wallet/transactions",
        json={"user_id": 10, "type": "compra", "amount": 10.0, "description": "x"},
    )
    assert resp.status_code == 201


# ----------------------------- GET /wallet/history -----------------------------

def test_get_history_requires_authentication(client):
    assert client.get("/wallet/history").status_code == 401


def test_get_history_rejects_invalid_user_id(client):
    resp = client.get("/wallet/history", headers={"X-User-Id": "abc"})
    assert resp.status_code == 400


def test_get_history_empty(client):
    resp = client.get("/wallet/history", headers={"X-User-Id": "10"})
    assert resp.status_code == 200
    data = resp.json()
    assert data == {"items": [], "total": 0, "skip": 0, "limit": 20}


def test_get_history_only_returns_own_transactions(client):
    create_transaction(client, user_id=10)
    create_transaction(client, user_id=20)

    resp = client.get("/wallet/history", headers={"X-User-Id": "10"})
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["user_id"] == 10


def test_get_history_default_order_is_most_recent_first(client):
    create_transaction(client, description="Primeira")
    create_transaction(client, description="Segunda")
    create_transaction(client, description="Terceira")

    resp = client.get("/wallet/history", headers={"X-User-Id": "10"})
    data = resp.json()
    assert [t["description"] for t in data["items"]] == ["Terceira", "Segunda", "Primeira"]
    assert data["total"] == 3


def test_get_history_filters_by_type(client):
    create_transaction(client, type="compra")
    create_transaction(client, type="recarga")

    resp = client.get("/wallet/history", params={"type": "recarga"}, headers={"X-User-Id": "10"})
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["type"] == "recarga"


def test_get_history_rejects_unknown_type_filter(client):
    resp = client.get("/wallet/history", params={"type": "saque"}, headers={"X-User-Id": "10"})
    assert resp.status_code == 400


def test_get_history_filters_by_period(client):
    db = TestingSessionLocal()
    old = WalletTransaction(
        user_id=10, type="compra", amount=10.0, description="Antiga",
        created_at=datetime.now(timezone.utc) - timedelta(days=30),
    )
    recent = WalletTransaction(
        user_id=10, type="compra", amount=20.0, description="Recente",
        created_at=datetime.now(timezone.utc),
    )
    db.add_all([old, recent])
    db.commit()
    db.close()

    start_date = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    resp = client.get(
        "/wallet/history", params={"start_date": start_date}, headers={"X-User-Id": "10"}
    )
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["description"] == "Recente"


def test_get_history_paginates(client):
    for i in range(5):
        create_transaction(client, description=f"Transação {i}")

    page = client.get(
        "/wallet/history", params={"skip": 2, "limit": 2}, headers={"X-User-Id": "10"}
    )
    data = page.json()
    assert data["total"] == 5
    assert data["skip"] == 2
    assert data["limit"] == 2
    assert [t["description"] for t in data["items"]] == ["Transação 2", "Transação 1"]


# ----------------------------- WalletLedger (unidade) -----------------------------

def test_wallet_ledger_rejects_invalid_type_at_service_layer():
    db = TestingSessionLocal()
    with pytest.raises(ValueError):
        WalletLedger.record_transaction(db=db, user_id=1, type="invalido", amount=10.0, description="x")
    db.close()


def test_wallet_ledger_rejects_non_positive_amount_at_service_layer():
    db = TestingSessionLocal()
    with pytest.raises(ValueError):
        WalletLedger.record_transaction(db=db, user_id=1, type="compra", amount=0, description="x")
    db.close()
