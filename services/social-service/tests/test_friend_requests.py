import os
import sys
import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

SOCIAL_DIR = str(Path(__file__).resolve().parent.parent)
for mod in list(sys.modules.keys()):
    if mod == "app" or mod.startswith("app."):
        del sys.modules[mod]
if SOCIAL_DIR in sys.path:
    sys.path.remove(SOCIAL_DIR)
sys.path.insert(0, SOCIAL_DIR)

import app.models.activity  # noqa: F401
import app.models.message  # noqa: F401
import app.models.friend  # noqa: F401
import app.models.group  # noqa: F401
import app.models.notification  # noqa: F401
from app.main import app
from app.db.database import Base, get_db
from app.models.friend import Friend
from app.models.notification import Notification

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


def test_list_friend_requests_pending(client):
    db = TestingSessionLocal()
    # User 1 sends request to User 5
    req = Friend(requester_id=1, addressee_id=5, status="pending")
    db.add(req)
    db.commit()

    # User 5 queries pending friend requests
    resp = client.get("/friends/requests", headers={"X-User-Id": "5"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["requester_id"] == 1
    assert data[0]["addressee_id"] == 5
    assert data[0]["status"] == "pending"
    assert data[0]["username"] is not None


def test_accept_friend_request_flow(client):
    db = TestingSessionLocal()
    # User 2 sends request to User 3
    req = Friend(requester_id=2, addressee_id=3, status="pending")
    db.add(req)
    db.commit()
    db.refresh(req)

    # User 3 accepts
    resp = client.post(f"/friends/accept/{req.id}", headers={"X-User-Id": "3"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "accepted"

    # User 3 checks pending requests (should now be empty)
    resp_pending = client.get("/friends/requests", headers={"X-User-Id": "3"})
    assert resp_pending.status_code == 200
    assert len(resp_pending.json()) == 0

    # User 3 checks friends list (should include user 2)
    resp_friends = client.get("/friends", headers={"X-User-Id": "3"})
    assert resp_friends.status_code == 200
    friends_list = resp_friends.json()
    assert any(f["friend_user_id"] == 2 for f in friends_list)


def test_reject_friend_request_flow(client):
    db = TestingSessionLocal()
    # User 4 sends request to User 5
    req = Friend(requester_id=4, addressee_id=5, status="pending")
    db.add(req)
    db.commit()
    db.refresh(req)

    # User 5 rejects
    resp = client.delete(f"/friends/{req.id}", headers={"X-User-Id": "5"})
    assert resp.status_code == 200
    assert resp.json()["success"] is True

    # User 5 checks pending requests
    resp_pending = client.get("/friends/requests", headers={"X-User-Id": "5"})
    assert resp_pending.status_code == 200
    assert len(resp_pending.json()) == 0
