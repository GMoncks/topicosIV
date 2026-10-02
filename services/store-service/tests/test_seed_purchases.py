import sys
from pathlib import Path
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

STORE_DIR = str(Path(__file__).resolve().parent.parent)
if STORE_DIR not in sys.path:
    sys.path.insert(0, STORE_DIR)

from app.db.database import Base
from app.models.purchase import Purchase
from app.models.wishlist import Wishlist
from app.db.seed_purchases import seed_purchases_and_wishlist, USER_PURCHASES_DATA, USER_WISHLISTS_DATA


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


def test_seed_purchases_and_wishlist(memory_db):
    added = seed_purchases_and_wishlist(memory_db)
    assert added > 0

    p_count = memory_db.query(Purchase).count()
    assert p_count == len(USER_PURCHASES_DATA)

    # Idempotência
    second_run = seed_purchases_and_wishlist(memory_db)
    assert second_run == 0
    assert memory_db.query(Purchase).count() == p_count
