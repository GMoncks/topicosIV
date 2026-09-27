import sys
import json
from pathlib import Path
from datetime import date
from unittest.mock import patch, AsyncMock

import httpx
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
from app.models.review import Review, ReviewVote
from app.services.review_service import ReviewService

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
    with TestClient(app) as c:
        yield c


@pytest.fixture
def game():
    db = TestingSessionLocal()
    db.add(Game(
        id=1,
        title="Jogo Aventura MIST",
        price=50.0,
        tags=["Ação"],
        category="Ação",
        banner_url="http://banner1.jpg",
        release_date=date(2025, 1, 1),
        description="Descrição A",
        screenshots=[],
        developer="MIST Devs",
        publisher="MIST Studios",
        review_score=9.5,
    ))
    db.commit()
    db.close()


def library_mock(owned=True, playtime_minutes=0, status_code=200, error=None):
    """Simula o client httpx respondendo ao has-game do library-service."""
    mock_client = AsyncMock(spec=httpx.AsyncClient)

    async def mock_get(url, *args, **kwargs):
        assert "has-game" in str(url)
        if error:
            raise error
        return httpx.Response(status_code, json={"owned": owned, "playtime_minutes": playtime_minutes})

    mock_client.get = mock_get
    return mock_client


def post_review(client, user_id=10, game_id=1, is_recommended=True, text="Ótimo jogo", **library):
    with patch("httpx.AsyncClient", return_value=library_mock(**library)):
        return client.post(
            f"/games/{game_id}/reviews",
            json={"is_recommended": is_recommended, "text": text},
            headers={"X-User-Id": str(user_id)},
        )


# ----------------------------- POST /games/{id}/reviews -----------------------------

def test_post_review_requires_authentication(client, game):
    resp = client.post("/games/1/reviews", json={"is_recommended": True, "text": "x"})
    assert resp.status_code == 401


def test_post_review_rejects_invalid_user_id(client, game):
    resp = client.post(
        "/games/1/reviews",
        json={"is_recommended": True, "text": "x"},
        headers={"X-User-Id": "abc"},
    )
    assert resp.status_code == 400


def test_post_review_unknown_game_is_404(client):
    assert post_review(client, game_id=999).status_code == 404


@pytest.mark.parametrize("text", ["", "   ", "x" * 2001])
def test_post_review_rejects_invalid_text(client, game, text):
    assert post_review(client, text=text).status_code == 422


def test_post_review_requires_ownership(client, game):
    resp = post_review(client, owned=False)
    assert resp.status_code == 403
    db = TestingSessionLocal()
    assert db.query(Review).count() == 0
    db.close()


@pytest.mark.parametrize("library", [
    {"error": httpx.ConnectError("library fora do ar")},
    {"error": httpx.ReadTimeout("timeout")},
    {"status_code": 500},
])
def test_post_review_fails_closed_when_library_unavailable(client, game, library):
    resp = post_review(client, **library)
    assert resp.status_code == 503
    db = TestingSessionLocal()
    assert db.query(Review).count() == 0
    db.close()


def test_post_review_creates_with_playtime(client, game):
    resp = post_review(client, playtime_minutes=135, text="  Vale cada minuto  ")
    assert resp.status_code == 201
    data = resp.json()
    assert data["user_id"] == 10
    assert data["game_id"] == 1
    assert data["is_recommended"] is True
    assert data["text"] == "Vale cada minuto"
    assert data["playtime_at_review"] == 135
    assert data["helpful_count"] == 0


def test_post_review_twice_updates_existing(client, game):
    assert post_review(client, playtime_minutes=60, is_recommended=True).status_code == 201
    resp = post_review(client, playtime_minutes=300, is_recommended=False, text="Mudei de ideia")
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_recommended"] is False
    assert data["text"] == "Mudei de ideia"
    assert data["playtime_at_review"] == 300

    db = TestingSessionLocal()
    assert db.query(Review).filter_by(user_id=10, game_id=1).count() == 1
    db.close()


# ----------------------------- GET /games/{id}/reviews -----------------------------

def test_list_reviews_unknown_game_is_404(client):
    assert client.get("/games/999/reviews").status_code == 404


def test_list_reviews_empty(client, game):
    resp = client.get("/games/1/reviews")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_reviews_default_order_is_most_recent_first(client, game):
    for user_id in (1, 2, 3):
        assert post_review(client, user_id=user_id, text=f"review {user_id}").status_code == 201
    resp = client.get("/games/1/reviews")
    assert [r["user_id"] for r in resp.json()] == [3, 2, 1]


def test_list_reviews_filters_by_recommendation(client, game):
    post_review(client, user_id=1, is_recommended=True)
    post_review(client, user_id=2, is_recommended=False)
    post_review(client, user_id=3, is_recommended=True)

    positives = client.get("/games/1/reviews", params={"is_recommended": "true"}).json()
    negatives = client.get("/games/1/reviews", params={"is_recommended": "false"}).json()
    assert sorted(r["user_id"] for r in positives) == [1, 3]
    assert [r["user_id"] for r in negatives] == [2]


def test_list_reviews_sorted_by_helpful(client, game):
    for user_id in (1, 2, 3):
        post_review(client, user_id=user_id, text=f"review {user_id}")
    reviews = {r["user_id"]: r["id"] for r in client.get("/games/1/reviews").json()}

    # review do usuário 1 recebe 2 votos, o do usuário 2 recebe 1, o do 3 nenhum
    for voter in (20, 21):
        assert client.post(f"/reviews/{reviews[1]}/helpful", headers={"X-User-Id": str(voter)}).status_code == 201
    assert client.post(f"/reviews/{reviews[2]}/helpful", headers={"X-User-Id": "20"}).status_code == 201

    resp = client.get("/games/1/reviews", params={"sort": "helpful"}).json()
    assert [(r["user_id"], r["helpful_count"]) for r in resp] == [(1, 2), (2, 1), (3, 0)]


def test_list_reviews_rejects_unknown_sort(client, game):
    assert client.get("/games/1/reviews", params={"sort": "random"}).status_code == 422


def test_list_reviews_paginates(client, game):
    for user_id in range(1, 6):
        post_review(client, user_id=user_id)
    page = client.get("/games/1/reviews", params={"skip": 2, "limit": 2}).json()
    assert [r["user_id"] for r in page] == [3, 2]


# ----------------------------- POST /reviews/{id}/helpful -----------------------------

def test_helpful_requires_authentication(client, game):
    assert client.post("/reviews/1/helpful").status_code == 401


def test_helpful_unknown_review_is_404(client, game):
    assert client.post("/reviews/999/helpful", headers={"X-User-Id": "5"}).status_code == 404


def test_helpful_cannot_vote_own_review(client, game):
    review_id = post_review(client, user_id=10).json()["id"]
    resp = client.post(f"/reviews/{review_id}/helpful", headers={"X-User-Id": "10"})
    assert resp.status_code == 403


def test_helpful_is_idempotent_per_user(client, game):
    review_id = post_review(client, user_id=10).json()["id"]

    first = client.post(f"/reviews/{review_id}/helpful", headers={"X-User-Id": "20"})
    assert first.status_code == 201
    assert first.json() == {"review_id": review_id, "helpful_count": 1, "created": True}

    again = client.post(f"/reviews/{review_id}/helpful", headers={"X-User-Id": "20"})
    assert again.status_code == 200
    assert again.json() == {"review_id": review_id, "helpful_count": 1, "created": False}

    other = client.post(f"/reviews/{review_id}/helpful", headers={"X-User-Id": "21"})
    assert other.json()["helpful_count"] == 2

    db = TestingSessionLocal()
    assert db.query(ReviewVote).filter_by(review_id=review_id).count() == 2
    db.close()


# ----------------------------- Aprovação em GET /games/{id} -----------------------------

def test_game_detail_without_reviews(client, game):
    data = client.get("/games/1").json()
    assert data["reviews_count"] == 0
    assert data["approval_pct"] is None
    assert data["approval_label"] == "Sem avaliações"
    assert data["review_score"] == 9.5  # coluna do seed permanece intacta


def test_game_detail_injects_approval_from_real_reviews(client, game):
    for user_id in range(1, 6):
        post_review(client, user_id=user_id, is_recommended=(user_id != 5))  # 4 positivos, 1 negativo

    data = client.get("/games/1").json()
    assert data["reviews_count"] == 5
    assert data["positive_count"] == 4
    assert data["approval_pct"] == 80
    assert data["approval_label"] == "Muito Positivo - 80%"


def test_game_detail_approval_follows_review_updates(client, game):
    post_review(client, user_id=1, is_recommended=True)
    assert client.get("/games/1").json()["approval_pct"] == 100

    post_review(client, user_id=1, is_recommended=False)
    data = client.get("/games/1").json()
    assert data["approval_pct"] == 0
    assert data["approval_label"] == "Muito Negativo - 0%"


@pytest.mark.parametrize("pct,label", [
    (100, "Extremamente Positivo"),
    (95, "Extremamente Positivo"),
    (94, "Muito Positivo"),
    (80, "Muito Positivo"),
    (79, "Majoritariamente Positivo"),
    (70, "Majoritariamente Positivo"),
    (69, "Misto"),
    (40, "Misto"),
    (39, "Majoritariamente Negativo"),
    (20, "Majoritariamente Negativo"),
    (19, "Muito Negativo"),
    (0, "Muito Negativo"),
])
def test_approval_label_thresholds(pct, label):
    assert ReviewService.approval_label(pct) == label
