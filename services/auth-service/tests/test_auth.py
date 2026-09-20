import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import os
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
from app.services.auth_service import hash_password, verify_password, create_access_token, decode_access_token


# Configura banco de dados em memória isolado para testes
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


@pytest.mark.unit
def test_bcrypt_hashing_and_verification():
    """Valida que o hash bcrypt é gerado corretamente e validado."""
    plain = "MinhaSenhaForte123!"
    hashed = hash_password(plain)
    assert hashed != plain
    assert verify_password(plain, hashed) is True
    assert verify_password("SenhaErrada", hashed) is False


@pytest.mark.unit
def test_jwt_generation_and_decoding():
    """Valida a emissão e integridade de decodificação do JWT."""
    payload = {"sub": "42", "username": "gamer_pro", "email": "gamer@mist.com"}
    token = create_access_token(payload)
    decoded = decode_access_token(token)
    assert decoded["sub"] == "42"
    assert decoded["username"] == "gamer_pro"
    assert decoded["email"] == "gamer@mist.com"
    assert "exp" in decoded


@pytest.mark.unit
def test_password_strength_validation_rejections(client):
    """Valida que o backend rejeita senhas que não atendem aos critérios de complexidade."""
    # Menos de 8 caracteres
    r1 = client.post("/register", json={"username": "user1", "email": "u1@mist.com", "password": "Aa1!"})
    assert r1.status_code == 422

    # Sem letra maiúscula
    r2 = client.post("/register", json={"username": "user2", "email": "u2@mist.com", "password": "senha@fraca1"})
    assert r2.status_code == 422

    # Sem letra minúscula
    r3 = client.post("/register", json={"username": "user3", "email": "u3@mist.com", "password": "SENHA@FORTE1"})
    assert r3.status_code == 422

    # Sem número
    r4 = client.post("/register", json={"username": "user4", "email": "u4@mist.com", "password": "Senha@SemNumero"})
    assert r4.status_code == 422

    # Sem símbolo especial
    r5 = client.post("/register", json={"username": "user5", "email": "u5@mist.com", "password": "SenhaComNumero123"})
    assert r5.status_code == 422


@pytest.mark.integration
def test_user_registration_initial_wallet(client):
    """Valida que um novo usuário recebe saldo inicial de R$ 200,00 e 500 pontos."""
    response = client.post("/register", json={
        "username": "gabriel_gamer",
        "email": "gabriel@mist.com",
        "password": "Senha@Segura123!"
    })
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    user = data["user"]
    assert user["username"] == "gabriel_gamer"
    assert user["email"] == "gabriel@mist.com"
    assert user["wallet_balance"] == 200.0
    assert user["points_balance"] == 500
    assert user["level"] == 1


@pytest.mark.integration
def test_duplicate_user_registration_fails(client):
    """Valida que registro com username ou email repetido falha com status 400."""
    user_payload = {
        "username": "usuario_unico",
        "email": "unico@mist.com",
        "password": "Senha@Segura123!"
    }
    r1 = client.post("/register", json=user_payload)
    assert r1.status_code == 201

    # Tenta registrar com mesmo username
    r2 = client.post("/register", json={
        "username": "usuario_unico",
        "email": "outro_email@mist.com",
        "password": "Senha@Segura123!"
    })
    assert r2.status_code == 400
    assert "Nome de usuário" in r2.json()["detail"]


@pytest.mark.integration
def test_user_login_success_and_failure(client):
    """Valida login com credenciais corretas e rejeição com incorretas."""
    client.post("/register", json={
        "username": "jogador1",
        "email": "jogador1@mist.com",
        "password": "Senha@Correta123!"
    })

    # Login por email
    r_email = client.post("/login", json={
        "username_or_email": "jogador1@mist.com",
        "password": "Senha@Correta123!"
    })
    assert r_email.status_code == 200
    assert "access_token" in r_email.json()

    # Login por username
    r_user = client.post("/login", json={
        "username_or_email": "jogador1",
        "password": "Senha@Correta123!"
    })
    assert r_user.status_code == 200

    # Senha errada
    r_fail = client.post("/login", json={
        "username_or_email": "jogador1",
        "password": "Senha@Errada999!"
    })
    assert r_fail.status_code == 401


@pytest.mark.integration
def test_get_current_user_profile_via_token_and_header(client):
    """Valida rota /me tanto com Bearer Token quanto via X-User-Id confiável."""
    reg = client.post("/register", json={
        "username": "perfil_gamer",
        "email": "perfil@mist.com",
        "password": "Senha@Segura123!"
    })
    token = reg.json()["access_token"]
    user_id = reg.json()["user"]["id"]

    # 1. Acesso via Bearer Token
    r_token = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert r_token.status_code == 200
    assert r_token.json()["username"] == "perfil_gamer"
    assert r_token.json()["wallet_balance"] == 200.0

    # 2. Acesso via Header confiável repassado pelo Gateway (X-User-Id)
    r_header = client.get("/me", headers={"X-User-Id": str(user_id)})
    assert r_header.status_code == 200
    assert r_header.json()["username"] == "perfil_gamer"


@pytest.mark.unit
def test_production_security_validation_rejection(monkeypatch):
    """Valida que a inicialização falha se ENVIRONMENT for production com chave insegura."""
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("JWT_SECRET_KEY", "mist_super_secret_jwt_key_development_secret_32bytes")

    with pytest.raises(RuntimeError, match="Configuração Insegura"):
        # Importa / recarrega a verificação
        import importlib
        import app.services.auth_service as auth_mod
        importlib.reload(auth_mod)

    # Restaura para ambiente de teste/dev
    monkeypatch.setenv("ENVIRONMENT", "development")
    import importlib
    import app.services.auth_service as auth_mod
    importlib.reload(auth_mod)


