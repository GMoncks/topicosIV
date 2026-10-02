import os
import sys
import json
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

import app.models.user  # noqa: F401
import app.models.inventory  # noqa: F401
import app.models.trading_card  # noqa: F401
import app.models.badge  # noqa: F401
from app.main import app
from app.db.database import Base, get_db
from app.models.user import User
from app.constants.points_shop_catalog import POINTS_SHOP_CATALOG

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
    return TestClient(app)


def test_update_user_profile_success(client):
    db = TestingSessionLocal()
    u = User(username="gamer_initial", email="gamer@mist.com", hashed_password="pw", wallet_balance=100.0, avatar_url="old_avatar.png")
    db.add(u)
    db.commit()
    db.refresh(u)

    resp = client.patch(
        "/me/profile",
        json={"username": "gamer_updated", "avatar_url": "https://images.com/new_avatar.png", "display_name": "Pro Gamer"},
        headers={"X-User-Id": str(u.id)}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == "gamer_updated"
    assert data["avatar_url"] == "https://images.com/new_avatar.png"
    assert data["real_name"] == "Pro Gamer"


def test_update_user_profile_duplicate_username(client):
    db = TestingSessionLocal()
    u1 = User(username="taken_name", email="u1@mist.com", hashed_password="pw", wallet_balance=100.0)
    u2 = User(username="other_player", email="u2@mist.com", hashed_password="pw", wallet_balance=100.0)
    db.add_all([u1, u2])
    db.commit()
    db.refresh(u2)

    resp = client.patch(
        "/me/profile",
        json={"username": "taken_name"},
        headers={"X-User-Id": str(u2.id)}
    )
    assert resp.status_code == 400
    assert "já está em uso" in resp.json()["detail"]


def test_recharge_wallet_endpoint(client):
    db = TestingSessionLocal()
    u = User(username="wallet_user", email="wallet@mist.com", hashed_password="pw", wallet_balance=250.0)
    db.add(u)
    db.commit()
    db.refresh(u)

    resp = client.post(
        "/me/wallet/recharge",
        json={"amount": 75.50},
        headers={"X-User-Id": str(u.id)}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["user_id"] == u.id
    assert data["amount"] == 75.50
    assert data["new_balance"] == 325.50
    assert data["operation"] == "recarga"


def test_points_shop_catalog_has_avatars():
    avatar_items = [item for item in POINTS_SHOP_CATALOG if item.get("item_type") == "avatar"]
    assert len(avatar_items) >= 4
    for it in avatar_items:
        assert it["id"].startswith("avatar_")
        assert it["price_points"] > 0
        assert "asset_url" in it
