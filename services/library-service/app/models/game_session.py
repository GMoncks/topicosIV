from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, Integer, String, DateTime
from app.db.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class GameSession(Base):
    __tablename__ = "game_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), unique=True, index=True, nullable=False, default=lambda: f"sess_{uuid.uuid4().hex[:16]}")
    session_token = Column(String(255), nullable=True)
    user_id = Column(Integer, nullable=False, index=True)
    game_id = Column(Integer, nullable=False, index=True)
    status = Column(String(20), default="active", nullable=False)  # active, ended
    started_at = Column(DateTime, default=utcnow, nullable=False)
    last_ping_at = Column(DateTime, default=utcnow, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, default=0, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "session_token": self.session_token,
            "user_id": self.user_id,
            "game_id": self.game_id,
            "status": self.status,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "last_ping_at": self.last_ping_at.isoformat() if self.last_ping_at else None,
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "duration_seconds": self.duration_seconds,
        }
