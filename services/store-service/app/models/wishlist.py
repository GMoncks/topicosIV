from sqlalchemy import Column, Integer, DateTime, UniqueConstraint
from datetime import datetime
from app.db.database import Base

class Wishlist(Base):
    __tablename__ = "wishlist"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, index=True, nullable=False)
    game_id = Column(Integer, index=True, nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint('user_id', 'game_id', name='uq_wishlist_user_game'),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "game_id": self.game_id,
            "added_at": self.added_at.isoformat() if self.added_at else None,
        }
