from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
from datetime import datetime
from app.db.database import Base

class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    game_id = Column(Integer, index=True, nullable=False)
    achievement_id = Column(String(100), index=True, nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    icon_url = Column(String(500), nullable=True)
    rarity = Column(String(50), default="Comum", nullable=False) # Comum, Raro, Épico, Lendário

    __table_args__ = (
        UniqueConstraint('game_id', 'achievement_id', name='uq_achievement_game_id'),
    )

class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, index=True, nullable=False)
    game_id = Column(Integer, index=True, nullable=False)
    achievement_id = Column(String(100), index=True, nullable=False)
    unlocked_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint('user_id', 'game_id', 'achievement_id', name='uq_user_achievement'),
    )
