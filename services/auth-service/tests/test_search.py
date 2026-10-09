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
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def seed_users():
    db = TestingSessionLocal()
    users = [
        User(username="mkritli", email="mauricio@live.com", hashed_password=hash_password("Password@123"), wallet_balance=450.0),
        User(username="gabriel_t800", email="gabriel@mistgames.com", hashed_password=hash_password("Password@123"), wallet_balance=1250.0),
        User(username="sarah_connor", email="sarah.connor@sky.net", hashed_password=hash_password("Password@123"), wallet_balance=85.0),
        User(username="lucas_speed", email="lucas.speed@speedrun.io", hashed_password=hash_password("Password@123"), wallet_balance=25.0),
    ]
    for u in users:
        db.add(u)
    db.commit()
    db.close()


def test_search_users_by_username(client, seed_users):
    resp = client.get("/users/search?q=gabriel")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["username"] == "gabriel_t800"
    assert "email" not in data[0]
    assert "wallet_balance" not in data[0]
    assert "points_balance" not in data[0]
    assert "level" in data[0]
    assert "games_count" in data[0]
    assert "friends_count" in data[0]



def test_search_users_by_email(client, seed_users):
    resp = client.get("/users/search?q=speedrun.io")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["username"] == "lucas_speed"


def test_search_users_empty_or_whitespace(client, seed_users):
    resp = client.get("/users/search?q=")
    assert resp.status_code == 200
    assert resp.json() == []

    resp2 = client.get("/users/search")
    assert resp2.status_code == 200
    assert resp2.json() == []


def test_search_users_limit(client, seed_users):
    resp = client.get("/users/search?q=a&limit=2")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2


def test_search_users_not_found(client, seed_users):
    resp = client.get("/users/search?q=inexistente999")
    assert resp.status_code == 200
    assert resp.json() == []
