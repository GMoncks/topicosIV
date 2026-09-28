from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Integer, JSON, String
from app.db.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


TRADE_STATUSES = {"pending", "accepted", "declined"}


class TradeOffer(Base):
    __tablename__ = "trade_offers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    sender_id = Column(Integer, index=True, nullable=False)
    receiver_id = Column(Integer, index=True, nullable=False)
    # Cada item: {"item_id": int, "item_type": str, "item_name": str | None}
    offered_items = Column(JSON, nullable=False)
    requested_items = Column(JSON, nullable=False)
    status = Column(String(20), index=True, default="pending", nullable=False)
    created_at = Column(DateTime, default=_utcnow, index=True, nullable=False)
    responded_at = Column(DateTime, nullable=True)
