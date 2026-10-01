from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.db.database import Base


class WorkshopItem(Base):
    __tablename__ = "workshop_items"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, nullable=False, index=True)
    game_title = Column(String(120), nullable=True)
    author_id = Column(Integer, nullable=False, index=True)
    author_name = Column(String(80), nullable=False)
    author_avatar = Column(String(255), nullable=True)
    title = Column(String(120), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False, default="Mod")  # Mod, Skin, Mapa, Tradução, Outro
    tags = Column(String(255), nullable=False, default="")  # separado por vírgula
    file_url = Column(String(255), nullable=False)
    filename = Column(String(120), nullable=False)
    file_size = Column(Integer, nullable=False, default=0)
    preview_url = Column(String(255), nullable=True)
    version = Column(String(30), nullable=False, default="1.0.0")
    downloads_count = Column(Integer, nullable=False, default=0)
    subscriptions_count = Column(Integer, nullable=False, default=0)
    rating = Column(Float, nullable=False, default=5.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    subscriptions = relationship(
        "WorkshopSubscription",
        back_populates="item",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class WorkshopSubscription(Base):
    __tablename__ = "workshop_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("workshop_items.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    item = relationship("WorkshopItem", back_populates="subscriptions")

    __table_args__ = (
        UniqueConstraint("user_id", "item_id", name="uq_user_workshop_subscription"),
    )
