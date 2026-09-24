from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, JSON, DateTime
from app.db.database import Base


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    type = Column(String(50), nullable=False, index=True)  # achievement_unlocked, game_purchased, level_up, friend_added
    payload = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "type": self.type,
            "payload": self.payload,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
