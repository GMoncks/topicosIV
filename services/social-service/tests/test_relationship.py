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
from app.main import app
from app.db.database import Base, get_db
from app.models.friend import Friend
from app.models.group import Group, GroupMember

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


def test_relationship_self(client):
    """SOC-UNIT-05: Relação entre o usuário e ele mesmo retorna 'self'."""
    res = client.get("/social/relationship/1/1")
    assert res.status_code == 200
    assert res.json()["relationship"] == "self"


def test_relationship_friend(client):
    """SOC-UNIT-06: Usuários com amizade aceita retornam 'friend' bidirecionalmente."""
    db = TestingSessionLocal()
    f = Friend(requester_id=1, addressee_id=2, status="accepted")
    db.add(f)
    db.commit()
    db.close()

    res1 = client.get("/social/relationship/1/2")
    assert res1.status_code == 200
    assert res1.json()["relationship"] == "friend"

    res2 = client.get("/social/relationship/2/1")
    assert res2.status_code == 200
    assert res2.json()["relationship"] == "friend"


def test_relationship_none_and_group(client):
    """SOC-UNIT-07: Usuários sem relação retornam 'none', e se compartilham grupo retornam 'group_member'."""
    # Sem relação
    res = client.get("/social/relationship/1/3")
    assert res.status_code == 200
    assert res.json()["relationship"] == "none"

    # Criando grupo comum
    db = TestingSessionLocal()
    grp = Group(id=1, name="Guilda RPG", owner_id=1)
    db.add(grp)
    db.commit()
    m1 = GroupMember(group_id=1, user_id=1, role="owner")
    m2 = GroupMember(group_id=1, user_id=3, role="member")
    db.add_all([m1, m2])
    db.commit()
    db.close()

    res_grp = client.get("/social/relationship/1/3")
    assert res_grp.status_code == 200
    assert res_grp.json()["relationship"] == "group_member"
