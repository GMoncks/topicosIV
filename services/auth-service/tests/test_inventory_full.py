import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import sys
from pathlib import Path

AUTH_DIR = str(Path(__file__).resolve().parent.parent)
for mod in list(sys.modules.keys()):
    if mod == "app" or mod.startswith("app."):
        del sys.modules[mod]
if AUTH_DIR in sys.path:
    sys.path.remove(AUTH_DIR)
sys.path.insert(0, AUTH_DIR)

from app.main import app
from app.db.database import Base, get_db
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
def seed_users_and_inventory():
    db = TestingSessionLocal()
    u1 = User(
        username="inventario_user1",
        email="user1@mist.com",
        hashed_password=hash_password("Senha123!"),
        wallet_balance=500.0,
        points_balance=1000,
        level=10,
    )
    u2 = User(
        username="inventario_user2",
        email="user2@mist.com",
        hashed_password=hash_password("Senha123!"),
        wallet_balance=300.0,
        points_balance=500,
        level=5,
    )
    db.add(u1)
    db.add(u2)
    db.commit()
    db.refresh(u1)
    db.refresh(u2)

    items = [
        InventoryItem(
            user_id=u1.id,
            item_id="card_ciri",
            name="Ciri de Cintra",
            item_type="card",
            asset_url="https://img.mist/ciri.png",
            status="disponivel",
            game_id=1,
            rarity="Raro",
            description="Carta rara de The Witcher"
        ),
        InventoryItem(
            user_id=u1.id,
            item_id="emoticon_smile",
            name=":mist_smile:",
            item_type="emoticon",
            asset_url="https://img.mist/smile.png",
            status="disponivel",
            rarity="Comum",
        ),
        InventoryItem(
            user_id=u1.id,
            item_id="bg_neon_city",
            name="Cidade Neon",
            item_type="background",
            asset_url="https://img.mist/neon_bg.png",
            status="disponivel",
            is_equipped=False,
            rarity="Raro",
        ),
        InventoryItem(
            user_id=u1.id,
            item_id="frame_neon_blue",
            name="Moldura Azul Neon",
            item_type="avatar_frame",
            asset_url="https://img.mist/frame_blue.png",
            status="disponivel",
            is_equipped=False,
            rarity="Épico",
        ),
        InventoryItem(
            user_id=u1.id,
            item_id="badge_veterano",
            name="Veterano de Guerra",
            item_type="badge",
            asset_url="https://img.mist/badge_vet.png",
            status="disponivel",
            rarity="Lendário",
        ),
        InventoryItem(
            user_id=u1.id,
            item_id="card_cyberpunk",
            name="Johnny Silverhand",
            item_type="card",
            asset_url="https://img.mist/johnny.png",
            status="listado",
            is_equipped=False,
            game_id=2,
            rarity="Épico"
        ),
    ]
    for it in items:
        db.add(it)
    db.commit()

    token1 = create_access_token(data={"sub": str(u1.id), "username": u1.username, "email": u1.email})
    token2 = create_access_token(data={"sub": str(u2.id), "username": u2.username, "email": u2.email})

    user1_id = u1.id
    user2_id = u2.id
    db.close()

    return {
        "user1": {"id": user1_id, "token": token1},
        "user2": {"id": user2_id, "token": token2},
    }


def test_get_inventory_grouped_and_filtering(client, seed_users_and_inventory):
    """Valida GET /inventory retornando agrupamento por tipo de item e filtros."""
    token = seed_users_and_inventory["user1"]["token"]

    resp = client.get("/inventory", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()

    assert data["total"] == 6
    assert len(data["items"]) == 6
    assert "grouped" in data

    grouped = data["grouped"]
    assert "card" in grouped
    assert "emoticon" in grouped
    assert "background" in grouped
    assert "avatar_frame" in grouped
    assert "badge" in grouped

    assert len(grouped["card"]) == 2
    assert len(grouped["emoticon"]) == 1
    assert len(grouped["background"]) == 1
    assert len(grouped["avatar_frame"]) == 1
    assert len(grouped["badge"]) == 1

    resp_filter_type = client.get("/inventory?item_type=card", headers={"Authorization": f"Bearer {token}"})
    assert resp_filter_type.status_code == 200
    cards_data = resp_filter_type.json()
    assert cards_data["total"] == 2
    assert all(i["item_type"] == "card" for i in cards_data["items"])

    resp_filter_status = client.get("/inventory?status_filter=listado", headers={"Authorization": f"Bearer {token}"})
    assert resp_filter_status.status_code == 200
    listed_data = resp_filter_status.json()
    assert listed_data["total"] == 1
    assert listed_data["items"][0]["item_id"] == "card_cyberpunk"


def test_equip_and_unequip_item_endpoints(client, seed_users_and_inventory):
    """Valida POST /inventory/items/{id}/equip e POST /inventory/items/{id}/unequip."""
    token = seed_users_and_inventory["user1"]["token"]

    inv_resp = client.get("/inventory?item_type=avatar_frame", headers={"Authorization": f"Bearer {token}"})
    frame_item = inv_resp.json()["items"][0]
    assert frame_item["status"] == "disponivel"
    assert frame_item["is_equipped"] is False

    equip_resp = client.post(
        f"/inventory/items/{frame_item['id']}/equip",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert equip_resp.status_code == 200
    equip_data = equip_resp.json()
    assert equip_data["success"] is True
    assert equip_data["equipped_item"]["status"] == "equipado"
    assert equip_data["equipped_item"]["is_equipped"] is True
    assert equip_data["avatar_frame_url"] == frame_item["asset_url"]

    me_resp = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.json()["avatar_frame_url"] == frame_item["asset_url"]

    unequip_resp = client.post(
        f"/inventory/items/{frame_item['id']}/unequip",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert unequip_resp.status_code == 200
    unequip_data = unequip_resp.json()
    assert unequip_data["success"] is True
    assert unequip_data["equipped_item"]["status"] == "disponivel"
    assert unequip_data["equipped_item"]["is_equipped"] is False
    assert unequip_data["avatar_frame_url"] is None

    me_resp2 = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp2.json()["avatar_frame_url"] is None


def test_cannot_equip_listed_item_conflict(client, seed_users_and_inventory):
    """Rejeita equipar item que está atualmente listado no Mercado (HTTP 409 Conflict)."""
    token = seed_users_and_inventory["user1"]["token"]

    inv_resp = client.get("/inventory?status_filter=listado", headers={"Authorization": f"Bearer {token}"})
    listed_item = inv_resp.json()["items"][0]

    resp = client.post(
        f"/inventory/items/{listed_item['id']}/equip",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 409
    assert "listado no mercado" in resp.json()["detail"].lower()


def test_equip_other_user_item_forbidden(client, seed_users_and_inventory):
    """Rejeita equipar item de outro usuário (HTTP 404)."""
    token2 = seed_users_and_inventory["user2"]["token"]
    token1 = seed_users_and_inventory["user1"]["token"]
    inv_resp = client.get("/inventory", headers={"Authorization": f"Bearer {token1}"})
    item_u1 = inv_resp.json()["items"][0]

    resp = client.post(
        f"/inventory/items/{item_u1['id']}/equip",
        headers={"Authorization": f"Bearer {token2}"}
    )
    assert resp.status_code == 404


def test_market_custody_lock_unlock_and_transfer(client, seed_users_and_inventory):
    """Valida endpoints de custódia /lock, /unlock e /transfer consumidos pelo market-service."""
    u1_id = seed_users_and_inventory["user1"]["id"]
    u2_id = seed_users_and_inventory["user2"]["id"]
    token1 = seed_users_and_inventory["user1"]["token"]

    inv_resp = client.get("/inventory?item_type=emoticon", headers={"Authorization": f"Bearer {token1}"})
    item = inv_resp.json()["items"][0]
    item_id = item["id"]

    lock_resp = client.post(f"/inventory/items/{item_id}/lock", json={"user_id": u1_id})
    assert lock_resp.status_code == 200
    assert lock_resp.json()["status"] == "listado"

    relock = client.post(f"/inventory/items/{item_id}/lock", json={"user_id": u1_id})
    assert relock.status_code == 409

    unlock_resp = client.post(f"/inventory/items/{item_id}/unlock", json={"user_id": u1_id})
    assert unlock_resp.status_code == 200
    assert unlock_resp.json()["status"] == "disponivel"

    transfer_resp = client.post(
        "/inventory/transfer",
        json={"item_id": item_id, "from_user_id": u1_id, "to_user_id": u2_id}
    )
    assert transfer_resp.status_code == 200
    transferred = transfer_resp.json()
    assert transferred["user_id"] == u2_id
    assert transferred["status"] == "disponivel"

    token2 = seed_users_and_inventory["user2"]["token"]
    u2_inv = client.get("/inventory", headers={"Authorization": f"Bearer {token2}"})
    assert any(i["id"] == item_id for i in u2_inv.json()["items"])
