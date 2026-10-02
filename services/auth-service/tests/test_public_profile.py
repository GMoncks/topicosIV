import sys
from pathlib import Path
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

AUTH_DIR = str(Path(__file__).resolve().parent.parent)
for mod in list(sys.modules.keys()):
    if mod == "app" or mod.startswith("app."):
        del sys.modules[mod]
if AUTH_DIR in sys.path:
    sys.path.remove(AUTH_DIR)
sys.path.insert(0, AUTH_DIR)

from app.db.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.inventory import InventoryItem
from app.services.auth_service import hash_password

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
def setup_db():
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    db = TestingSessionLocal()
    u1 = User(
        id=101,
        username="public_alice",
        email="alice@mist.gg",
        hashed_password=hash_password("Pass@1234"),
        wallet_balance=100.0,
        points_balance=500,
        level=3,
        total_xp=950,
        privacy_games="Todos",
        privacy_achievements="Todos",
        privacy_playtime="Privado",
        privacy_inventory="Privado",
    )
    u2 = User(
        id=102,
        username="visitor_bob",
        email="bob@mist.gg",
        hashed_password=hash_password("Pass@1234"),
        wallet_balance=50.0,
        points_balance=100,
        level=1,
        total_xp=100,
    )
    b1 = InventoryItem(
        user_id=101,
        item_id="badge_game_1",
        name="Veterano de Cyberpulse",
        item_type="badge",
        asset_url="https://images.unsplash.com/photo-badge.jpg",
        price_points=0,
        is_equipped=True,
        status="equipado",
        game_id=1,
    )
    c1 = InventoryItem(
        user_id=101,
        item_id="card_neon_1",
        name="Carta Neon Alpha",
        item_type="card",
        asset_url="https://images.unsplash.com/photo-card.jpg",
        price_points=0,
        is_equipped=False,
        status="disponivel",
        game_id=2,
    )
    db.add_all([u1, u2, b1, c1])
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


client = TestClient(app)


def test_public_profile_anonymous_visitor_privacy():
    """AUTH-UNIT-14: Visita anônima respeita visibilidade (playtime/inventory privados são None)."""
    response = client.get("/users/public_alice/profile")
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "public_alice"
    assert data["id"] == 101
    assert data["level"] == 3
    assert data["relationship"] == "none"
    # playtime e inventory foram configurados como 'Privado'
    assert data["playtime_minutes"] is None
    assert data["inventory_count"] is None
    # Badges são sempre visíveis
    assert len(data["badges"]) == 1
    assert data["badges"][0]["name"] == "Veterano de Cyberpulse"
    # privacy_settings é oculto para terceiros
    assert data["privacy_settings"] is None


def test_public_profile_self_view():
    """AUTH-UNIT-15: Próprio usuário visualizando seu perfil vê tudo e recebe privacy_settings."""
    response = client.get("/users/public_alice/profile", headers={"X-User-Id": "101"})
    assert response.status_code == 200
    data = response.json()
    assert data["relationship"] == "self"
    assert data["privacy_settings"] is not None
    assert data["privacy_settings"]["privacy_playtime"] == "Privado"
    assert data["privacy_settings"]["privacy_inventory"] == "Privado"
    # Mesmo com status 'Privado', o dono visualiza suas seções
    assert data["inventory_count"] == 2


def test_update_privacy_settings():
    """AUTH-UNIT-16: Atualização de configurações de privacidade via PATCH /me/privacy."""
    patch_resp = client.patch(
        "/me/privacy",
        headers={"X-User-Id": "101"},
        json={"privacy_games": "Amigos", "privacy_inventory": "Todos"}
    )
    assert patch_resp.status_code == 200
    pdata = patch_resp.json()
    assert pdata["privacy_games"] == "Amigos"
    assert pdata["privacy_inventory"] == "Todos"
    assert pdata["privacy_playtime"] == "Privado"

    # Confirmação no GET /me/privacy
    get_resp = client.get("/me/privacy", headers={"X-User-Id": "101"})
    assert get_resp.status_code == 200
    assert get_resp.json()["privacy_games"] == "Amigos"
    assert get_resp.json()["privacy_inventory"] == "Todos"


def test_public_profile_not_found():
    """AUTH-UNIT-17: 404 para username inexistente."""
    response = client.get("/users/nonexistent_user_9999/profile")
    assert response.status_code == 404
