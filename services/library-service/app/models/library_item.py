from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Boolean, DateTime, UniqueConstraint
from app.db.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class LibraryItem(Base):
    __tablename__ = "library_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    game_id = Column(Integer, nullable=False, index=True)
    acquired_at = Column(DateTime, default=utcnow, nullable=False)
    playtime_minutes = Column(Integer, default=0, nullable=False)
    is_installed = Column(Boolean, default=False, nullable=False)
    last_played = Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint('user_id', 'game_id', name='uq_user_game'),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "game_id": self.game_id,
            "acquired_at": self.acquired_at.isoformat() if self.acquired_at else None,
            "playtime_minutes": self.playtime_minutes,
            "is_installed": self.is_installed,
            "last_played": self.last_played.isoformat() if self.last_played else None,
        }
