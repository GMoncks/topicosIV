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
from app.models.transaction import WalletTransaction

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


@pytest.fixture
def active_listing():
    """Cria um anúncio ativo diretamente no banco, sem passar pelo POST /market/list."""
    db = TestingSessionLocal()
    listing = MarketListing(
        id=1, seller_id=10, item_id=5, item_type="card", item_name="Carta Lendária",
        price=40.0, status="ativo",
    )
    db.add(listing)
    db.commit()
    db.close()
    return listing


def build_mock_client(debit=200, credit=200, transfer=200, debit_balance=60.0):
    mock_client = AsyncMock(spec=httpx.AsyncClient)
    calls = {"debit": [], "credit": [], "transfer": []}

    async def mock_post(url, json=None, *args, **kwargs):
        url = str(url)
        if "wallet/debit" in url:
            calls["debit"].append(json)
            if debit != 200:
                return httpx.Response(debit)
            return httpx.Response(200, json={"new_balance": debit_balance})
        if "wallet/credit" in url:
            calls["credit"].append(json)
            return httpx.Response(credit)
        if "inventory/transfer" in url:
            calls["transfer"].append(json)
            return httpx.Response(transfer)
        return httpx.Response(404)

    mock_client.post = mock_post
    return mock_client, calls


def buy(client, listing_id=1, buyer_id=20, **mock_kwargs):
    mock_client, calls = build_mock_client(**mock_kwargs)
    with patch("httpx.AsyncClient", return_value=mock_client):
        resp = client.post(f"/market/buy/{listing_id}", headers={"X-User-Id": str(buyer_id)})
    return resp, calls


# ----------------------------- Validações prévias -----------------------------

def test_buy_requires_authentication(client, active_listing):
    assert client.post("/market/buy/1").status_code == 401


def test_buy_unknown_listing_is_404(client):
    resp, _ = buy(client, listing_id=999)
    assert resp.status_code == 404


def test_buy_already_sold_listing_is_409(client, active_listing):
    db = TestingSessionLocal()
    listing = db.query(MarketListing).first()
    listing.status = "vendido"
    db.commit()
    db.close()

    resp, calls = buy(client)
    assert resp.status_code == 409
    assert calls["debit"] == []  # nunca chegou a tentar debitar


def test_buy_own_listing_is_rejected(client, active_listing):
    resp, calls = buy(client, buyer_id=10)  # 10 é o seller_id do fixture
    assert resp.status_code == 400
    assert calls["debit"] == []


# ----------------------------- Fluxo de sucesso -----------------------------

def test_buy_success_transfers_balance_and_custody(client, active_listing):
    resp, calls = buy(client)
    assert resp.status_code == 201
    data = resp.json()
    assert data["listing"]["status"] == "vendido"
    assert data["listing"]["buyer_id"] == 20
    assert data["new_wallet_balance"] == 60.0

    assert calls["debit"] == [{"amount": 40.0}]
    assert calls["credit"] == [{"amount": 40.0}]
    assert calls["transfer"] == [{"item_id": 5, "from_user_id": 10, "to_user_id": 20}]

    db = TestingSessionLocal()
    listing = db.query(MarketListing).first()
    assert listing.status == "vendido"
    assert listing.buyer_id == 20
    assert listing.sold_at is not None
    db.close()


def test_buy_success_records_wallet_ledger_for_both_parties(client, active_listing):
    buy(client)

    db = TestingSessionLocal()
    txs = db.query(WalletTransaction).order_by(WalletTransaction.user_id).all()
    db.close()

    assert len(txs) == 2
    buyer_tx = next(t for t in txs if t.user_id == 20)
    seller_tx = next(t for t in txs if t.user_id == 10)
    assert buyer_tx.type == "compra"
    assert buyer_tx.amount == 40.0
    assert seller_tx.type == "venda"
    assert seller_tx.amount == 40.0


def test_buy_a_second_time_fails_listing_already_sold(client, active_listing):
    buy(client, buyer_id=20)
    resp, _ = buy(client, buyer_id=30)
    assert resp.status_code == 409


# ----------------------------- Falhas e compensação (Saga) -----------------------------

def test_buy_insufficient_funds_does_not_touch_listing(client, active_listing):
    resp, calls = buy(client, debit=400)
    assert resp.status_code == 400
    assert calls["credit"] == []
    assert calls["transfer"] == []

    db = TestingSessionLocal()
    assert db.query(MarketListing).first().status == "ativo"
    db.close()


def test_buy_seller_credit_failure_refunds_buyer(client, active_listing):
    resp, calls = buy(client, credit=500)
    assert resp.status_code == 502
    # debitou o comprador, tentou creditar o vendedor (falhou) e estornou o comprador
    assert calls["debit"] == [{"amount": 40.0}]
    assert calls["credit"] == [{"amount": 40.0}, {"amount": 40.0}]  # tentativa + estorno
    assert calls["transfer"] == []

    db = TestingSessionLocal()
    assert db.query(MarketListing).first().status == "ativo"
    assert db.query(WalletTransaction).count() == 0
    db.close()


def test_buy_item_transfer_failure_reverses_both_wallets(client, active_listing):
    resp, calls = buy(client, transfer=500)
    assert resp.status_code == 502
    # debitou o comprador e depois reverteu o crédito do vendedor (2 débitos)
    assert calls["debit"] == [{"amount": 40.0}, {"amount": 40.0}]
    # creditou o vendedor e depois estornou o comprador (2 créditos)
    assert calls["credit"] == [{"amount": 40.0}, {"amount": 40.0}]
    assert calls["transfer"] == [{"item_id": 5, "from_user_id": 10, "to_user_id": 20}]

    db = TestingSessionLocal()
    listing = db.query(MarketListing).first()
    assert listing.status == "ativo"
    assert listing.buyer_id is None
    assert db.query(WalletTransaction).count() == 0
    db.close()
