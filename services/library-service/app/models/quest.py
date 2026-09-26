from sqlalchemy import Column, Integer, String, Boolean, DateTime, UniqueConstraint
from datetime import datetime, timezone
from app.db.database import Base


class DynamicQuest(Base):
    __tablename__ = "dynamic_quests"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, index=True, nullable=False)
    game_id = Column(Integer, index=True, nullable=False)
    quest_key = Column(String(100), index=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(String(500), nullable=False)
    xp_reward = Column(Integer, default=150, nullable=False)
    target_type = Column(String(50), default="playtime", nullable=False)  # playtime, achievements, score
    target_value = Column(Integer, default=30, nullable=False)
    progress = Column(Integer, default=0, nullable=False)
    is_completed = Column(Boolean, default=False, nullable=False)
    is_claimed = Column(Boolean, default=False, nullable=False)
    week_key = Column(String(20), index=True, nullable=False)  # ex: 2026-W39
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint('user_id', 'game_id', 'quest_key', 'week_key', name='uq_user_game_quest_week'),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "game_id": self.game_id,
            "quest_key": self.quest_key,
            "title": self.title,
            "description": self.description,
            "xp_reward": self.xp_reward,
            "target_type": self.target_type,
            "target_value": self.target_value,
            "progress": self.progress,
            "is_completed": self.is_completed,
            "is_claimed": self.is_claimed,
            "week_key": self.week_key,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
