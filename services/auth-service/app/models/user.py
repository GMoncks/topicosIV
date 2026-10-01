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
    avatar_url = Column(String(255), nullable=True)
    avatar_frame_url = Column(String(255), nullable=True)
    profile_background_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    inventory_items = relationship("InventoryItem", back_populates="user", cascade="all, delete-orphan")

