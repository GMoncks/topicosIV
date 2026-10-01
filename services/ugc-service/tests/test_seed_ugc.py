import sys
from pathlib import Path
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

UGC_DIR = str(Path(__file__).resolve().parent.parent)
if UGC_DIR not in sys.path:
    sys.path.insert(0, UGC_DIR)

from app.db.database import Base
from app.models.screenshot import Screenshot
from app.models.workshop import WorkshopItem, WorkshopSubscription
from app.db.seed_ugc import seed_ugc_data, SAMPLE_SCREENSHOTS, SAMPLE_MODS


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


def test_seed_ugc_data(memory_db):
    added = seed_ugc_data(memory_db)
    assert added == len(SAMPLE_SCREENSHOTS) + len(SAMPLE_MODS)

    assert memory_db.query(Screenshot).count() == len(SAMPLE_SCREENSHOTS)
    assert memory_db.query(WorkshopItem).count() == len(SAMPLE_MODS)

    total_expected_subs = sum(len(m["subscribers"]) for m in SAMPLE_MODS)
    assert memory_db.query(WorkshopSubscription).count() == total_expected_subs

    # Idempotência
    second_run = seed_ugc_data(memory_db)
    assert second_run == 0
    assert memory_db.query(Screenshot).count() == len(SAMPLE_SCREENSHOTS)
    assert memory_db.query(WorkshopItem).count() == len(SAMPLE_MODS)
