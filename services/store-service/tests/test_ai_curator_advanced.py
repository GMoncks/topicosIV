import os
import sys
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

STORE_DIR = str(Path(__file__).resolve().parent.parent)
for mod in list(sys.modules.keys()):
    if mod == "app" or mod.startswith("app."):
        del sys.modules[mod]
if STORE_DIR in sys.path:
    sys.path.remove(STORE_DIR)
sys.path.insert(0, STORE_DIR)

from app.main import app
from app.db.database import Base, get_db
from app.db.seed import seed_games
from app.models.game import Game
from app.models.purchase import Purchase
from app.models.wishlist import Wishlist

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
    db = TestingSessionLocal()
    seed_games(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


def test_calculate_top_sellers_ranking(client):
    """
    STORE-UNIT-11 — S-01: Cálculo de Top Vendidos a partir de checkouts
    """
    db = TestingSessionLocal()
    # Adiciona compras de teste
    # Jogo 2 com 3 compras
    for i in range(3):
        db.add(Purchase(user_id=10 + i, game_id=2, price_paid=49.90, status="completed"))
    # Jogo 1 com 1 compra
    db.add(Purchase(user_id=20, game_id=1, price_paid=89.90, status="completed"))
    # Jogo com compra cancelada/reembolsada (não deve contar)
    db.add(Purchase(user_id=30, game_id=3, price_paid=29.90, status="refunded"))
    db.commit()

    from app.services.ai_trends import calculate_top_sellers
    top_sellers = calculate_top_sellers(db=db, limit=2)
    assert len(top_sellers) == 2
    assert top_sellers[0]["id"] == 2
    assert top_sellers[0]["sales_count"] == 3
    assert top_sellers[1]["id"] == 1
    assert top_sellers[1]["sales_count"] == 1
    db.close()


def test_top_sellers_api_endpoint(client):
    """
    STORE-UNIT-11 — S-01: Rota REST GET /store/trends/top-sellers
    """
    db = TestingSessionLocal()
    db.add(Purchase(user_id=1, game_id=1, price_paid=50.0, status="completed"))
    db.commit()
    db.close()

    response = client.get("/store/trends/top-sellers?limit=3")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) <= 3
    assert any(g["id"] == 1 for g in data)


def test_calculate_trending_games(client):
    """
    STORE-UNIT-12 — S-01: Cálculo de jogos 'Em Alta' (Trending) com compras recentes e review score
    """
    db = TestingSessionLocal()
    now = datetime.now(timezone.utc)
    # Compra recente (ontem)
    db.add(Purchase(user_id=1, game_id=1, price_paid=50.0, status="completed", purchased_at=now - timedelta(days=1)))
    # Compra antiga (40 dias atrás - fora da janela de 7 dias)
    db.add(Purchase(user_id=2, game_id=2, price_paid=50.0, status="completed", purchased_at=now - timedelta(days=40)))
    db.commit()

    from app.services.ai_trends import calculate_trending_games
    trending = calculate_trending_games(db=db, limit=4, days=7)
    assert len(trending) <= 4
    # O jogo 1 deve estar com boost de trending devido à compra recente
    ids = [g["id"] for g in trending]
    assert 1 in ids
    db.close()


def test_trending_api_endpoint(client):
    """
    STORE-UNIT-12 — S-01: Rota REST GET /store/trends/trending
    """
    response = client.get("/store/trends/trending?limit=4")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) <= 4
    for game in data:
        assert "trending_score" in game or "review_score" in game


def test_contextual_ai_curator_justifications():
    """
    STORE-UNIT-13 — S-02: Geração de justificativas contextuais em linguagem natural
    """
    from app.services.ai_curator import generate_contextual_justification

    # Caso 1: Usuário jogou jogo de gênero similar
    played = [{"id": 1, "title": "Stardew Valley", "tags": ["Farming", "RPG", "Relaxante"]}]
    target_game = {"id": 4, "title": "Sun Haven", "tags": ["RPG", "Farming", "Magia"]}
    justification = generate_contextual_justification(played_games=played, target_game=target_game)
    assert "Stardew Valley" in justification or "Farming" in justification or "RPG" in justification
    assert "Porque você" in justification or "Como você" in justification or "Recomendado" in justification

    # Caso 2: Visitante sem jogos jogados
    guest_justification = generate_contextual_justification(played_games=[], target_game=target_game)
    assert len(guest_justification) > 10
    assert "destaque" in guest_justification.lower() or "popular" in guest_justification.lower() or "comunidade" in guest_justification.lower()


def test_wishlist_discount_alerts():
    """
    STORE-UNIT-14 — S-03: Notificador proativo de descontos em itens da Wishlist
    """

    db = TestingSessionLocal()
    # Cria jogos com e sem desconto
    g1 = db.query(Game).filter(Game.id == 1).first()
    g1.discount_percentage = 40
    g1.original_price = 100.0
    g1.price = 60.0

    g2 = db.query(Game).filter(Game.id == 2).first()
    g2.discount_percentage = 0
    g2.original_price = 50.0
    g2.price = 50.0

    # Usuário 42 tem ambos na wishlist
    db.add(Wishlist(user_id=42, game_id=1))
    db.add(Wishlist(user_id=42, game_id=2))
    db.commit()

    from app.services.wishlist_ai import get_wishlist_discount_alerts
    alerts = get_wishlist_discount_alerts(db=db, user_id=42)
    assert len(alerts) == 1
    assert alerts[0]["game_id"] == 1
    assert alerts[0]["discount_percentage"] == 40
    assert alerts[0]["current_price"] == 60.0
    assert "message" in alerts[0]
    assert len(alerts[0]["message"]) > 0
    db.close()


def test_wishlist_discount_alerts_api_endpoint(client):
    """
    STORE-UNIT-14 — S-03: Rota GET /store/wishlist/alerts autenticada
    """
    db = TestingSessionLocal()
    g = db.query(Game).filter(Game.id == 1).first()
    g.discount_percentage = 25
    g.original_price = 100.0
    g.price = 75.0
    db.add(Wishlist(user_id=99, game_id=1))
    db.commit()
    db.close()

    headers = {"X-User-Id": "99"}
    response = client.get("/store/wishlist/alerts", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["game_id"] == 1
    assert data[0]["discount_percentage"] == 25
