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
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def seed_user():
    db = TestingSessionLocal()
    user = User(
        username="gamer_wallet",
        email="gamer@mist.com",
        hashed_password=hash_password("SenhaForte123!"),
        wallet_balance=200.0,
        points_balance=500,
        level=1,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    uid = user.id
    db.close()
    return uid


@pytest.mark.unit
def test_debit_wallet_sufficient_funds(client, seed_user):
    """Valida débito atômico bem-sucedido quando o usuário possui saldo suficiente."""
    response = client.post(
        f"/users/{seed_user}/wallet/debit",
        json={"amount": 47.49, "reason": "Compra de teste"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == seed_user
    assert data["previous_balance"] == 200.0
    assert data["amount"] == 47.49
    assert data["new_balance"] == 152.51
    assert data["operation"] == "debit"


@pytest.mark.unit
def test_debit_wallet_insufficient_funds(client, seed_user):
    """Valida rejeição com 400 Bad Request quando saldo é menor que o valor debitado."""
    response = client.post(
        f"/users/{seed_user}/wallet/debit",
        json={"amount": 250.00, "reason": "Compra além do limite"}
    )
    assert response.status_code == 400
    data = response.json()
    assert "Saldo insuficiente" in data["detail"]


@pytest.mark.unit
def test_debit_wallet_user_not_found(client):
    """Valida 404 quando o usuário a ser debitado não existe."""
    response = client.post(
        "/users/9999/wallet/debit",
        json={"amount": 10.00}
    )
    assert response.status_code == 404
    assert "Usuário não encontrado" in response.json()["detail"]


@pytest.mark.unit
def test_credit_wallet_and_compensation(client, seed_user):
    """Valida estorno/crédito compensatório de saldo."""
    # Primeiro debita
    client.post(f"/users/{seed_user}/wallet/debit", json={"amount": 50.00})

    # Executa crédito (estorno)
    response = client.post(
        f"/users/{seed_user}/wallet/credit",
        json={"amount": 50.00, "reason": "Estorno compensatório Saga"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["previous_balance"] == 150.0
    assert data["amount"] == 50.0
    assert data["new_balance"] == 200.0
    assert data["operation"] == "credit"


@pytest.mark.unit
def test_debit_wallet_zero_amount(client, seed_user):
    """Valida que débito de R$ 0,00 (jogos gratuitos) é aceito sem erro e não altera saldo."""
    response = client.post(
        f"/users/{seed_user}/wallet/debit",
        json={"amount": 0.0, "reason": "Compra de jogo gratuito"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == seed_user
    assert data["previous_balance"] == 200.0
    assert data["amount"] == 0.0
    assert data["new_balance"] == 200.0
    assert data["operation"] == "debit"

