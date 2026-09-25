import os
import sys
import json
from pathlib import Path
from datetime import date
import pytest
import httpx
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import patch, AsyncMock

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
from app.models.purchase import Purchase
from app.models.wishlist import Wishlist
from app.services.store_service import StoreService

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
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def seed_games_data():
    db = TestingSessionLocal()
    g1 = Game(
        id=1,
        title="Jogo Aventura MIST",
        price=50.0,
        tags=["Ação", "Aventura"],
        category="Ação",
        banner_url="http://banner1.jpg",
        release_date=date(2025, 1, 1),
        description="Descrição A",
        screenshots=["http://s1.jpg"],
        developer="MIST Devs",
        publisher="MIST Studios",
        review_score=9.5
    )
    g2 = Game(
        id=2,
        title="Jogo RPG Terceiros",
        price=30.0,
        tags=["RPG"],
        category="RPG",
        banner_url="http://banner2.jpg",
        release_date=date(2025, 2, 1),
        description="Descrição B",
        screenshots=["http://s2.jpg"],
        developer="Steam Studio",
        publisher="Steam Imported",
        review_score=8.0
    )
    g3 = Game(
        id=3,
        title="Jogo Gratuito MIST",
        price=0.0,
        tags=["Free"],
        category="Casual",
        banner_url="http://banner3.jpg",
        release_date=date(2025, 3, 1),
        description="Descrição Free",
        screenshots=["http://s3.jpg"],
        developer="MIST Devs",
        publisher="MIST Studios",
        review_score=9.0
    )
    db.add(g1)
    db.add(g2)
    db.add(g3)
    db.commit()
    db.close()
    return [1, 2, 3]


@pytest.mark.unit
def test_checkout_unauthenticated(client):
    """Rejeita 401 quando X-User-Id está ausente."""
    resp = client.post("/checkout", json={"game_id": 1})
    assert resp.status_code == 401
    assert "Autenticação necessária" in resp.json()["detail"]


@pytest.mark.unit
def test_checkout_empty_games(client):
    """Rejeita 400 quando nenhum jogo é informado."""
    resp = client.post("/checkout", json={}, headers={"X-User-Id": "10"})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_checkout_single_game_success(client, seed_games_data):
    """Valida compra unitária bem-sucedida, débito, concessão, auditoria e remoção da wishlist."""
    # Adiciona previamente à wishlist
    db = TestingSessionLocal()
    StoreService.add_to_wishlist(db, user_id=10, game_id=1)
    assert len(StoreService.get_user_wishlist(db, user_id=10)) == 1
    db.close()

    mock_client = AsyncMock(spec=httpx.AsyncClient)

    async def mock_get(url, *args, **kwargs):
        if "has-game" in str(url):
            return httpx.Response(200, json={"owned": False})
        return httpx.Response(404)

    async def mock_post(url, *args, **kwargs):
        if "wallet/debit" in str(url):
            return httpx.Response(200, json={"new_balance": 150.0})
        if "library/grant" in str(url):
            return httpx.Response(201, json={"created": True})
        return httpx.Response(404)

    mock_client.get = mock_get
    mock_client.post = mock_post

    with patch("httpx.AsyncClient", return_value=mock_client):
        resp = client.post("/checkout", json={"game_id": 1}, headers={"X-User-Id": "10"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "success"
        assert data["total_paid"] == 50.0
        assert data["new_wallet_balance"] == 150.0
        assert len(data["items"]) == 1
        assert data["items"][0]["title"] == "Jogo Aventura MIST"

    # Valida que foi removido da wishlist
    db = TestingSessionLocal()
    assert len(StoreService.get_user_wishlist(db, user_id=10)) == 0
    # Valida que registro em Purchase foi criado
    purchases = db.query(Purchase).filter_by(user_id=10, game_id=1).all()
    assert len(purchases) == 1
    assert purchases[0].price_paid == 50.0
    assert purchases[0].status == "completed"
    db.close()


@pytest.mark.asyncio
async def test_checkout_cart_multiple_games_success(client, seed_games_data):
    """Valida checkout em lote (carrinho) somando preços autoritativos."""
    mock_client = AsyncMock(spec=httpx.AsyncClient)
    debited_amounts = []

    async def mock_get(url, *args, **kwargs):
        if "has-game" in str(url):
            return httpx.Response(200, json={"owned": False})
        return httpx.Response(404)

    async def mock_post(url, json=None, *args, **kwargs):
        if "wallet/debit" in str(url):
            debited_amounts.append(json["amount"])
            return httpx.Response(200, json={"new_balance": 120.0})
        if "library/grant" in str(url):
            return httpx.Response(201, json={"created": True})
        return httpx.Response(404)

    mock_client.get = mock_get
    mock_client.post = mock_post

    with patch("httpx.AsyncClient", return_value=mock_client):
        resp = client.post("/checkout", json={"game_ids": [1, 2]}, headers={"X-User-Id": "10"})
        assert resp.status_code == 201
        data = resp.json()
        # 50.0 + 30.0 = 80.0
        assert data["total_paid"] == 80.0
        assert data["new_wallet_balance"] == 120.0
        assert len(data["items"]) == 2
        assert debited_amounts == [80.0]


@pytest.mark.asyncio
async def test_checkout_already_owned_conflict(client, seed_games_data):
    """Valida 409 Conflict se o usuário já possui um dos jogos, sem debitar a carteira."""
    mock_client = AsyncMock(spec=httpx.AsyncClient)

    async def mock_get(url, *args, **kwargs):
        if "has-game" in str(url):
            return httpx.Response(200, json={"owned": True})
        return httpx.Response(404)

    mock_client.get = mock_get
    mock_client.post = AsyncMock()

    with patch("httpx.AsyncClient", return_value=mock_client):
        resp = client.post("/checkout", json={"game_id": 1}, headers={"X-User-Id": "10"})
        assert resp.status_code == 409
        assert "Você já possui" in resp.json()["detail"]
        # Garante que NENHUM post de débito foi executado
        assert mock_client.post.call_count == 0


@pytest.mark.asyncio
async def test_checkout_insufficient_funds(client, seed_games_data):
    """Valida 400 Bad Request se a carteira não possui saldo suficiente."""
    mock_client = AsyncMock(spec=httpx.AsyncClient)

    async def mock_get(url, *args, **kwargs):
        if "has-game" in str(url):
            return httpx.Response(200, json={"owned": False})
        return httpx.Response(404)

    async def mock_post(url, *args, **kwargs):
        if "wallet/debit" in str(url):
            return httpx.Response(400, json={"detail": "Saldo insuficiente na carteira MIST"})
        return httpx.Response(404)

    mock_client.get = mock_get
    mock_client.post = mock_post

    with patch("httpx.AsyncClient", return_value=mock_client):
        resp = client.post("/checkout", json={"game_id": 1}, headers={"X-User-Id": "10"})
        assert resp.status_code == 400
        assert "Saldo insuficiente" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_checkout_saga_compensation_refund(client, seed_games_data):
    """Valida compensação Saga: se a concessão falha, o saldo é integralmente estornado."""
    mock_client = AsyncMock(spec=httpx.AsyncClient)
    credit_called = []

    async def mock_get(url, *args, **kwargs):
        if "has-game" in str(url):
            return httpx.Response(200, json={"owned": False})
        return httpx.Response(404)

    async def mock_post(url, json=None, *args, **kwargs):
        if "wallet/debit" in str(url):
            return httpx.Response(200, json={"new_balance": 150.0})
        if "library/grant" in str(url):
            # Falha intencional de concessão
            return httpx.Response(500)
        if "wallet/credit" in str(url):
            credit_called.append(json)
            return httpx.Response(200, json={"new_balance": 200.0})
        return httpx.Response(404)

    mock_client.get = mock_get
    mock_client.post = mock_post

    with patch("httpx.AsyncClient", return_value=mock_client):
        resp = client.post("/checkout", json={"game_id": 1}, headers={"X-User-Id": "10"})
        assert resp.status_code == 502
        assert "estornada para sua carteira" in resp.json()["detail"]
        # Verifica se o crédito compensatório foi executado com o valor de 50.0
        assert len(credit_called) == 1
        assert credit_called[0]["amount"] == 50.0


@pytest.mark.asyncio
async def test_checkout_free_game_success(client, seed_games_data):
    """Valida compra direta de jogo gratuito (R$ 0,00) sem falha de débito."""
    # Jogo 2 custa 0.0
    mock_client = AsyncMock(spec=httpx.AsyncClient)
    debit_called = []

    async def mock_get(url, *args, **kwargs):
        if "has-game" in str(url):
            return httpx.Response(200, json={"owned": False})
        return httpx.Response(404)

    async def mock_post(url, json=None, *args, **kwargs):
        if "wallet/debit" in str(url):
            debit_called.append(json)
            return httpx.Response(200, json={"new_balance": 100.0})
        if "library/grant" in str(url):
            return httpx.Response(201, json={"created": True})
        return httpx.Response(404)

    mock_client.get = mock_get
    mock_client.post = mock_post

    with patch("httpx.AsyncClient", return_value=mock_client):
        resp = client.post("/checkout", json={"game_id": 3}, headers={"X-User-Id": "10"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["total_paid"] == 0.0
        assert len(data["items"]) == 1
        assert debit_called[0]["amount"] == 0.0

