from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship
from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    wallet_balance = Column(Float, default=200.0, nullable=False)
    points_balance = Column(Integer, default=500, nullable=False)
    level = Column(Integer, default=1, nullable=False)
    total_xp = Column(Integer, default=100, nullable=False)
    avatar_url = Column(String(255), nullable=True)
    avatar_frame_url = Column(String(255), nullable=True)
    profile_background_url = Column(String(255), nullable=True)
    real_name = Column(String(100), nullable=True)
    bio = Column(String(500), nullable=True)
    location = Column(String(100), default="Brasil", nullable=True)
    privacy_games = Column(String(20), default="Todos", nullable=False)
    privacy_achievements = Column(String(20), default="Todos", nullable=False)
    privacy_playtime = Column(String(20), default="Todos", nullable=False)
    privacy_inventory = Column(String(20), default="Todos", nullable=False)
    privacy_screenshots = Column(String(20), default="Todos", nullable=False)
    privacy_groups = Column(String(20), default="Todos", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    inventory_items = relationship("InventoryItem", back_populates="user", cascade="all, delete-orphan")

