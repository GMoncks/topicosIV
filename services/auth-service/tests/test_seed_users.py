import sys
from pathlib import Path
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

AUTH_DIR = str(Path(__file__).resolve().parent.parent)
if AUTH_DIR not in sys.path:
    sys.path.insert(0, AUTH_DIR)

from app.db.database import Base
from app.models.user import User
from app.db.seed_users import seed_users, SEED_USERS


@pytest.fixture
def memory_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = Session()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


def test_seed_users_creates_all_default_users(memory_db):
    added = seed_users(memory_db)
    assert added == len(SEED_USERS)

    total_in_db = memory_db.query(User).count()
    assert total_in_db == len(SEED_USERS)

    # Verifica se os usuários chave existem com campos corretos
    mkritli = memory_db.query(User).filter(User.username == "mkritli").first()
    assert mkritli is not None
    assert mkritli.email == "mauricio@live.com"
    assert mkritli.wallet_balance == 450.00
    assert mkritli.points_balance == 3500

    gabriel = memory_db.query(User).filter(User.username == "gabriel_t800").first()
    assert gabriel is not None
    assert gabriel.wallet_balance == 1250.00


def test_seed_users_is_idempotent(memory_db):
    first_run = seed_users(memory_db)
    assert first_run == len(SEED_USERS)

    # Modifica saldo de um usuário em runtime
    mkritli = memory_db.query(User).filter(User.username == "mkritli").first()
    mkritli.wallet_balance = 9999.0
    memory_db.commit()

    # Segunda execução da seed (como se a aplicação reiniciasse)
    second_run = seed_users(memory_db)
    assert second_run == 0

    # Garante que o valor modificado foi preservado
    mkritli_reloaded = memory_db.query(User).filter(User.username == "mkritli").first()
    assert mkritli_reloaded.wallet_balance == 9999.0
