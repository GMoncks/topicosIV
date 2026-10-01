import sys
from pathlib import Path
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

MARKET_DIR = str(Path(__file__).resolve().parent.parent)
if MARKET_DIR not in sys.path:
    sys.path.insert(0, MARKET_DIR)

from app.db.database import Base
from app.models.transaction import WalletTransaction
from app.models.listing import MarketListing
from app.db.seed_market import seed_market_data, USER_TRANSACTIONS, SAMPLE_LISTINGS


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


def test_seed_market_data(memory_db):
    added = seed_market_data(memory_db)
    assert added == len(USER_TRANSACTIONS) + len(SAMPLE_LISTINGS)

    assert memory_db.query(WalletTransaction).count() == len(USER_TRANSACTIONS)
    assert memory_db.query(MarketListing).count() == len(SAMPLE_LISTINGS)

    # Idempotência
    second_run = seed_market_data(memory_db)
    assert second_run == 0
    assert memory_db.query(WalletTransaction).count() == len(USER_TRANSACTIONS)
