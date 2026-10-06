import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.library_item import LibraryItem

logger = logging.getLogger(__name__)

USER_LIBRARY_DATA = [
    # mkritli (id 1)
    {"user_id": 1, "game_id": 11, "playtime": 8420, "installed": True, "days_ago": 1},
    {"user_id": 1, "game_id": 13, "playtime": 5100, "installed": True, "days_ago": 3},
    {"user_id": 1, "game_id": 12, "playtime": 2760, "installed": True, "days_ago": 7},
    {"user_id": 1, "game_id": 1, "playtime": 480, "installed": True, "days_ago": 10},
    {"user_id": 1, "game_id": 10, "playtime": 0, "installed": True, "days_ago": 2},  # Não iniciado
    {"user_id": 1, "game_id": 14, "playtime": 0, "installed": False, "days_ago": 15}, # Não iniciado
    # gabriel_t800 (id 2)
    {"user_id": 2, "game_id": 8, "playtime": 12300, "installed": True, "days_ago": 2},
    {"user_id": 2, "game_id": 9, "playtime": 3600, "installed": True, "days_ago": 5},
    {"user_id": 2, "game_id": 2, "playtime": 1500, "installed": True, "days_ago": 8},
    {"user_id": 2, "game_id": 15, "playtime": 45, "installed": True, "days_ago": 12},
    {"user_id": 2, "game_id": 7, "playtime": 0, "installed": True, "days_ago": 4},   # Não iniciado
    {"user_id": 2, "game_id": 5, "playtime": 0, "installed": False, "days_ago": 14}, # Não iniciado
    # sarah_connor (id 3)
    {"user_id": 3, "game_id": 12, "playtime": 6800, "installed": True, "days_ago": 1},
    {"user_id": 3, "game_id": 3, "playtime": 1920, "installed": True, "days_ago": 6},
    {"user_id": 3, "game_id": 6, "playtime": 750, "installed": True, "days_ago": 11},
    {"user_id": 3, "game_id": 1, "playtime": 0, "installed": True, "days_ago": 3},   # Não iniciado
    {"user_id": 3, "game_id": 16, "playtime": 0, "installed": False, "days_ago": 18}, # Não iniciado
    # lucas_speed (id 4)
    {"user_id": 4, "game_id": 10, "playtime": 9200, "installed": True, "days_ago": 1},
    {"user_id": 4, "game_id": 2, "playtime": 4100, "installed": True, "days_ago": 4},
    {"user_id": 4, "game_id": 14, "playtime": 180, "installed": True, "days_ago": 15},
    {"user_id": 4, "game_id": 15, "playtime": 120, "installed": True, "days_ago": 18},
    {"user_id": 4, "game_id": 13, "playtime": 0, "installed": True, "days_ago": 2},   # Não iniciado
    # elena_rpg (id 5)
    {"user_id": 5, "game_id": 13, "playtime": 14500, "installed": True, "days_ago": 1},
    {"user_id": 5, "game_id": 5, "playtime": 7200, "installed": True, "days_ago": 3},
    {"user_id": 5, "game_id": 8, "playtime": 4800, "installed": True, "days_ago": 8},
    {"user_id": 5, "game_id": 3, "playtime": 0, "installed": True, "days_ago": 5},   # Não iniciado
    {"user_id": 5, "game_id": 2, "playtime": 0, "installed": False, "days_ago": 16}, # Não iniciado
    # novato_mist (id 6)
    {"user_id": 6, "game_id": 16, "playtime": 35, "installed": True, "days_ago": 1},
    {"user_id": 6, "game_id": 2, "playtime": 0, "installed": True, "days_ago": 2},    # Não iniciado
]


def seed_library_items(db: Session) -> int:
    """Popula os itens da biblioteca dos usuários caso ainda não existam."""
    now = datetime.now(timezone.utc)
    added = 0

    for item in USER_LIBRARY_DATA:
        u_id = item["user_id"]
        g_id = item["game_id"]
        existing = db.query(LibraryItem).filter(LibraryItem.user_id == u_id, LibraryItem.game_id == g_id).first()
        if not existing:
            days_ago = item.get("days_ago", 5)
            acq_at = now - timedelta(days=days_ago)
            playtime = item.get("playtime", 0)
            last_played = (now - timedelta(hours=4)) if playtime > 0 else None

            li = LibraryItem(
                user_id=u_id,
                game_id=g_id,
                acquired_at=acq_at,
                playtime_minutes=playtime,
                is_installed=item.get("installed", False),
                last_played=last_played,
            )
            db.add(li)
            added += 1

    if added > 0:
        db.commit()
        logger.info(f"Seed de biblioteca concluída: {added} itens de biblioteca inseridos.")
    return added
