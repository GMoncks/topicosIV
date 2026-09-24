import os
import sys
import json
from pathlib import Path
from datetime import date
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
from app.models.game import Game
from app.db.seed import seed_games, SEED_GAMES
from app.services.store_service import StoreService

# Configura banco de dados em memória isolado com StaticPool
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
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client(db_session):
    # Popula o banco de teste com a seed
    seed_games(db_session)
    with TestClient(app) as test_client:
        yield test_client


# ==========================================
# 1. Testes do Modelo SQLAlchemy Game
# ==========================================

@pytest.mark.unit
def test_game_model_creation(db_session):
    """STORE-UNIT-01: Valida instanciação, tipos e persistência do modelo Game."""
    game = Game(
        title="Chronicles of the Void",
        description="Uma odisseia espacial épica através de buracos de minhoca e mistérios ancestrais.",
        price=149.90,
        tags=["Ficção Científica", "Exploração", "Espaço"],
        category="Aventura",
        banner_url="https://example.com/banner.jpg",
        screenshots=["https://example.com/s1.jpg", "https://example.com/s2.jpg"],
        release_date=date(2026, 11, 20),
        publisher="Nebula Interactive",
        review_score=9.5
    )
    db_session.add(game)
    db_session.commit()
    db_session.refresh(game)

    assert game.id is not None
    assert game.title == "Chronicles of the Void"
    assert game.price == 149.90
    assert "Ficção Científica" in game.tags
    assert len(game.screenshots) == 2
    assert game.release_date == date(2026, 11, 20)
    assert game.publisher == "Nebula Interactive"
    assert game.review_score == 9.5

    data_dict = game.to_dict()
    assert data_dict["id"] == game.id
    assert data_dict["release_date"] == "2026-11-20"


# ==========================================
# 2. Testes da Seed do Catálogo
# ==========================================

@pytest.mark.unit
def test_seed_games_catalog_integrity(db_session):
    """STORE-UNIT-02: Valida integridade e presença de todos os jogos da seed exigida."""
    # Seed inicial
    inserted = seed_games(db_session)
    assert 10 <= inserted <= 25, f"Esperado entre 10 e 25 jogos na seed, obtido: {inserted}"

    # Idempotência (executar novamente não duplica registros)
    second_run = seed_games(db_session)
    assert second_run == 0

    expected_games = {
        "The Blood of the Dawnwalker": {"date": date(2026, 9, 3), "price": 275.00},
        "Orbitals": {"date": date(2026, 9, 3), "price": 90.00},
        "Onimusha: Way of the Sword": {"date": date(2026, 9, 4), "price": 200.00},
        "Marvel's Wolverine": {"date": date(2026, 9, 15), "price": 400.00},
        "Fire Emblem: Fortune's Weave": {"date": date(2026, 9, 17), "price": 150.00},
        "Silent Hill: Townfall": {"date": date(2026, 9, 24), "price": 250.00},
        "Control Resonant": {"date": date(2026, 9, 24), "price": 350.00},
        "The Witcher 3: Wild Hunt — Remastered": {"date": date(2026, 9, 29), "price": 300.00},
        "Wardogs": {"date": date(2026, 9, 10), "price": 199.00},
    }

    for title, meta in expected_games.items():
        game = db_session.query(Game).filter(Game.title == title).first()
        assert game is not None, f"Jogo obrigatório '{title}' não foi encontrado na base!"
        assert game.release_date == meta["date"], f"Data incorreta para '{title}': esperado {meta['date']}, obtido {game.release_date}"
        assert abs(game.price - meta["price"]) < 0.01, f"Preço incorreto para '{title}': esperado {meta['price']}, obtido {game.price}"
        assert game.description, f"Jogo '{title}' deve conter descrição"
        assert len(game.tags) > 0, f"Jogo '{title}' deve conter tags"
        assert game.banner_url.startswith("http"), f"Jogo '{title}' deve ter banner_url válida"
        assert len(game.screenshots) >= 2, f"Jogo '{title}' deve conter screenshots"
        assert game.publisher, f"Jogo '{title}' deve ter publisher"
        assert game.review_score > 0, f"Jogo '{title}' deve ter review_score"


# ==========================================
# 3. Testes do Endpoint GET /games (Listagem e Filtros)
# ==========================================

@pytest.mark.integration
def test_get_games_unfiltered(client):
    """STORE-INT-01: Listagem completa do catálogo sem parâmetros de busca."""
    response = client.get("/games")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 10
    first_game = data[0]
    for key in ["id", "title", "price", "tags", "category", "banner_url", "release_date", "publisher", "review_score"]:
        assert key in first_game


@pytest.mark.integration
def test_get_games_filter_by_category(client):
    """STORE-INT-02: Filtro por categoria específica."""
    response = client.get("/games?category=Terror")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert all(g["category"].lower() == "terror" for g in data)
    assert any(g["title"] == "Silent Hill: Townfall" for g in data)


@pytest.mark.integration
def test_get_games_filter_by_tag(client):
    """STORE-INT-03: Filtro por tag contida na lista de tags."""
    response = client.get("/games?tag=Espaço")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert any("Espaço" in g["tags"] for g in data)
    assert any(g["title"] == "Orbitals" for g in data)


@pytest.mark.integration
def test_get_games_filter_by_price_range(client):
    """STORE-INT-04: Filtro combinado de preço mínimo e máximo."""
    response = client.get("/games?min_price=150.0&max_price=250.0")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    for game in data:
        assert 150.0 <= game["price"] <= 250.0


@pytest.mark.integration
def test_get_games_text_search(client):
    """STORE-INT-05: Busca textual por título, descrição ou distribuidora."""
    response = client.get("/games?search=Wolverine")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Marvel's Wolverine"

    # Busca alternativa por termo na descrição
    response_desc = client.get("/games?q=samurai")
    assert response_desc.status_code == 200
    data_desc = response_desc.json()
    assert any("Onimusha" in g["title"] for g in data_desc)


@pytest.mark.integration
def test_get_games_sorting(client):
    """STORE-INT-06: Ordenação por preço, avaliação e data de lançamento."""
    # Ordenação por preço decrescente
    resp_price_desc = client.get("/games?sort_by=price&order=desc")
    assert resp_price_desc.status_code == 200
    data_price_desc = resp_price_desc.json()
    prices = [g["price"] for g in data_price_desc]
    assert prices == sorted(prices, reverse=True)

    # Ordenação por preço crescente
    resp_price_asc = client.get("/games?sort_by=price&order=asc")
    assert resp_price_asc.status_code == 200
    data_price_asc = resp_price_asc.json()
    prices_asc = [g["price"] for g in data_price_asc]
    assert prices_asc == sorted(prices_asc)

    # Ordenação por avaliação decrescente
    resp_score_desc = client.get("/games?sort_by=review_score&order=desc")
    assert resp_score_desc.status_code == 200
    scores = [g["review_score"] for g in resp_score_desc.json()]
    assert scores == sorted(scores, reverse=True)


# ==========================================
# 4. Testes do Endpoint GET /games/{id}
# ==========================================

@pytest.mark.integration
def test_get_game_details_success(client):
    """STORE-INT-07: Detalhes completos de um jogo existente por ID."""
    # Primeiro busca um jogo para obter seu ID
    list_resp = client.get("/games?search=Wolverine")
    game_id = list_resp.json()[0]["id"]

    resp = client.get(f"/games/{game_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == game_id
    assert data["title"] == "Marvel's Wolverine"
    assert "description" in data
    assert len(data["description"]) > 20
    assert "screenshots" in data
    assert len(data["screenshots"]) >= 2
    assert "banner_url" in data
    assert data["price"] == 400.00
    assert data["publisher"] == "Sony Interactive Entertainment"


@pytest.mark.integration
def test_get_game_details_not_found(client):
    """STORE-INT-08: Resposta 404 para ID inexistente."""
    resp = client.get("/games/999999")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Jogo não encontrado"
