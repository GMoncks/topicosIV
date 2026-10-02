import sys
from pathlib import Path
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

LIB_DIR = str(Path(__file__).resolve().parent.parent)
if LIB_DIR not in sys.path:
    sys.path.insert(0, LIB_DIR)

from app.db.database import Base
from app.models.library_item import LibraryItem
from app.db.seed_library import seed_library_items, USER_LIBRARY_DATA


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


def test_seed_library_items(memory_db):
    added = seed_library_items(memory_db)
    assert added == len(USER_LIBRARY_DATA)

    # Verifica jogo não iniciado (0 minutos e last_played None)
    unplayed = memory_db.query(LibraryItem).filter(LibraryItem.user_id == 1, LibraryItem.game_id == 10).first()
    assert unplayed is not None
    assert unplayed.playtime_minutes == 0
    assert unplayed.last_played is None

    # Verifica jogo muito jogado
    hardcore = memory_db.query(LibraryItem).filter(LibraryItem.user_id == 1, LibraryItem.game_id == 11).first()
    assert hardcore is not None
    assert hardcore.playtime_minutes == 8420
    assert hardcore.last_played is not None

    # Idempotência
    second_run = seed_library_items(memory_db)
    assert second_run == 0
    assert memory_db.query(LibraryItem).count() == len(USER_LIBRARY_DATA)
