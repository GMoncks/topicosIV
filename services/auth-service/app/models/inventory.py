from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id = Column(String(100), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    item_type = Column(String(50), nullable=False, index=True)  # avatar_frame, background, emoticon, profile_bundle
    asset_url = Column(String(500), nullable=False)
    price_points = Column(Integer, default=0, nullable=False)
    is_equipped = Column(Boolean, default=False, nullable=False)
    status = Column(String(50), default="disponivel", nullable=False, index=True)  # disponivel, equipado, listado
    game_id = Column(Integer, nullable=True, index=True)
    rarity = Column(String(50), default="Comum", nullable=True)
    description = Column(String(255), nullable=True)
    acquired_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="inventory_items")
