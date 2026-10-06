import sys
from pathlib import Path
import pytest
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
from app.services.xp_service import calculate_level, get_level_progress
from app.models.user import User
from app.models.inventory import InventoryItem
from app.services.auth_service import hash_password, create_access_token

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
    user = User(
        id=10,
        username="card_crafter",
        email="crafter@mist.gg",
        hashed_password=hash_password("Pass@1234"),
        wallet_balance=500.0,
        points_balance=1000,
        level=1,
        total_xp=100,
    )
    db.add(user)
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_xp_engine_math():
    assert calculate_level(100) == 1
    assert calculate_level(399) == 1
    assert calculate_level(400) == 2
    assert calculate_level(899) == 2
    assert calculate_level(900) == 3
    assert calculate_level(1600) == 4

    progress = get_level_progress(250)
    assert progress["level"] == 1
    assert progress["current_level_min_xp"] == 100
    assert progress["next_level_min_xp"] == 400
    assert progress["current_xp_in_level"] == 150
    assert progress["xp_needed_in_level"] == 300
    assert progress["progress_percent"] == 50.0


def test_grant_card_and_catalog(client):
    cat_res = client.get("/cards/catalog?game_id=2")
    assert cat_res.status_code == 200
    cards = cat_res.json()
    assert len(cards) >= 3

    grant_res = client.post("/cards/grant", json={
        "user_id": 10,
        "game_id": 2,
        "card_id": cards[0]["id"]
    })
    assert grant_res.status_code == 201
    grant_data = grant_res.json()
    assert grant_data["success"] is True
    assert grant_data["inventory_item"]["item_type"] == "card"
    assert grant_data["inventory_item"]["game_id"] == 2


def test_crafting_incomplete_set_fails(client):
    token = create_access_token(data={"sub": "10", "username": "card_crafter", "email": "crafter@mist.gg"})
    headers = {"Authorization": f"Bearer {token}"}

    craft_res = client.post("/crafting/badge", json={"game_id": 1}, headers=headers)
    assert craft_res.status_code == 400
    assert "Set incompleto" in craft_res.json()["detail"]


def test_crafting_full_set_success_and_level_up(client):
    token = create_access_token(data={"sub": "10", "username": "card_crafter", "email": "crafter@mist.gg"})
    headers = {"Authorization": f"Bearer {token}"}

    cat_res = client.get("/cards/catalog?game_id=1")
    req_cards = cat_res.json()
    assert len(req_cards) >= 3

    for c in req_cards:
        res = client.post("/cards/grant", json={
            "user_id": 10,
            "game_id": 1,
            "card_id": c["id"]
        })
        assert res.status_code == 201

    db = TestingSessionLocal()
    user = db.query(User).filter(User.id == 10).first()
    user.total_xp = 300
    db.commit()
    db.close()

    craft_res = client.post("/crafting/badge", json={"game_id": 1}, headers=headers)
    assert craft_res.status_code == 200
    craft_data = craft_res.json()
    assert craft_data["success"] is True
    assert craft_data["new_total_xp"] == 400
    assert craft_data["new_level"] == 2
    assert craft_data["leveled_up"] is True
    assert craft_data["badge_item"]["item_type"] == "badge"

    inv_res = client.get("/inventory", headers=headers)
    assert inv_res.status_code == 200
    cards_remaining = inv_res.json()["grouped"].get("card", [])
    assert len(cards_remaining) == 0

    badges_res = client.get("/badges/user/10")
    assert badges_res.status_code == 200
    assert len(badges_res.json()) >= 1

    prog_res = client.get("/me/level-progress", headers=headers)
    assert prog_res.status_code == 200
    p = prog_res.json()
    assert p["level"] == 2
    assert p["total_xp"] == 400
