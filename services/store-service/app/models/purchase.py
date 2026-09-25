from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, DateTime
from app.db.database import Base


class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, index=True, nullable=False)
    game_id = Column(Integer, index=True, nullable=False)
    price_paid = Column(Float, nullable=False)
    status = Column(String(50), default="completed", nullable=False)  # completed, refunded, failed
    purchased_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    idempotency_key = Column(String(100), unique=True, nullable=True, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "game_id": self.game_id,
            "price_paid": self.price_paid,
            "status": self.status,
            "purchased_at": self.purchased_at.isoformat() if self.purchased_at else None,
            "idempotency_key": self.idempotency_key,
        }
