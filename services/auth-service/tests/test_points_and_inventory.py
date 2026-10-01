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
def seed_user():
    db = TestingSessionLocal()
    user = User(
        username="gamer_points",
        email="gamer_points@mist.com",
        hashed_password=hash_password("SenhaForte123!"),
        wallet_balance=200.0,
        points_balance=2500,
        level=5,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    user_id = user.id
    token = create_access_token(data={"sub": str(user_id), "username": user.username, "email": user.email})
    db.close()
    return {"id": user_id, "token": token, "username": "gamer_points"}


@pytest.mark.unit
def test_credit_points_success(client, seed_user):
    """Valida crédito de Pontos MIST de forma atômica."""
    user_id = seed_user["id"]
    resp = client.post(
        f"/users/{user_id}/points/credit",
        json={"amount": 1000, "reason": "Checkout MIST 10 reais"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["previous_balance"] == 2500
    assert data["amount"] == 1000
    assert data["new_balance"] == 3500


@pytest.mark.unit
def test_credit_points_invalid_user_or_amount(client):
    """Rejeita crédito com ID inexistente ou valor não positivo."""
    resp = client.post("/users/9999/points/credit", json={"amount": 100})
    assert resp.status_code == 404

    resp2 = client.post("/users/1/points/credit", json={"amount": 0})
    assert resp2.status_code == 422


@pytest.mark.unit
def test_list_points_shop_items(client, seed_user):
    """Lista catálogo de pontos marcando posse para usuário autenticado."""
    token = seed_user["token"]
    resp = client.get("/points-shop/items", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 4
    for item in items:
        assert "id" in item
        assert "price_points" in item
        assert "asset_url" in item
        assert item["is_owned"] is False


@pytest.mark.unit
def test_purchase_points_shop_item_success(client, seed_user):
    """Resgata item com pontos deduzindo saldo e criando item no inventário."""
    token = seed_user["token"]
    # Compra frame_neon que custa 1000 pontos (saldo inicial: 2500)
    resp = client.post(
        "/points-shop/purchase",
        json={"item_id": "frame_neon"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["new_points_balance"] == 1500
    assert data["item"]["item_id"] == "frame_neon"
    assert data["item"]["is_equipped"] is False

    # Valida no inventário
    inv_resp = client.get("/inventory", headers={"Authorization": f"Bearer {token}"})
    assert inv_resp.status_code == 200
    inv = inv_resp.json()
    assert inv["total"] == 1
    assert inv["items"][0]["item_id"] == "frame_neon"


@pytest.mark.unit
def test_purchase_points_shop_duplicate_conflict(client, seed_user):
    """Rejeita 409 quando o usuário tenta comprar o mesmo cosmético duas vezes."""
    token = seed_user["token"]
    resp1 = client.post(
        "/points-shop/purchase",
        json={"item_id": "frame_neon"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp1.status_code == 200

    resp2 = client.post(
        "/points-shop/purchase",
        json={"item_id": "frame_neon"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp2.status_code == 409
    assert "já possui" in resp2.json()["detail"]


@pytest.mark.unit
def test_purchase_points_shop_insufficient_points(client, seed_user):
    """Rejeita 400 quando o saldo de pontos é insuficiente."""
    token = seed_user["token"]
    # Banquete à Beira-Mar custa 2500 pts. Se comprarmos p1 (500), restam 2000, insuficiente para p3 (2500).
    client.post("/points-shop/purchase", json={"item_id": "p1"}, headers={"Authorization": f"Bearer {token}"})
    resp = client.post("/points-shop/purchase", json={"item_id": "p3"}, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 400
    assert "Saldo insuficiente" in resp.json()["detail"]


@pytest.mark.unit
def test_equip_and_unequip_cosmetics(client, seed_user):
    """Equipa moldura e plano de fundo, atualiza profile e desequipa."""
    token = seed_user["token"]
    # Compra frame_neon e p1 (background)
    client.post("/points-shop/purchase", json={"item_id": "frame_neon"}, headers={"Authorization": f"Bearer {token}"})
    client.post("/points-shop/purchase", json={"item_id": "p1"}, headers={"Authorization": f"Bearer {token}"})

    inv_resp = client.get("/inventory", headers={"Authorization": f"Bearer {token}"})
    items = inv_resp.json()["items"]
    frame_item = next(i for i in items if i["item_id"] == "frame_neon")
    bg_item = next(i for i in items if i["item_id"] == "p1")

    # Equipa a moldura
    equip_frame = client.post(
        "/profile/equip",
        json={"inventory_item_id": frame_item["id"], "action": "equip"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert equip_frame.status_code == 200
    assert equip_frame.json()["avatar_frame_url"] == frame_item["asset_url"]

    # Equipa o plano de fundo
    equip_bg = client.post(
        "/profile/equip",
        json={"inventory_item_id": bg_item["id"], "action": "equip"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert equip_bg.status_code == 200
    assert equip_bg.json()["profile_background_url"] == bg_item["asset_url"]

    # Checa GET /me
    me_resp = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    me = me_resp.json()
    assert me["avatar_frame_url"] == frame_item["asset_url"]
    assert me["profile_background_url"] == bg_item["asset_url"]

    # Desequipa moldura
    unequip_frame = client.post(
        "/profile/equip",
        json={"inventory_item_id": frame_item["id"], "action": "unequip"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert unequip_frame.status_code == 200
    assert unequip_frame.json()["avatar_frame_url"] is None

    me_resp2 = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp2.json()["avatar_frame_url"] is None
    assert me_resp2.json()["profile_background_url"] == bg_item["asset_url"]
