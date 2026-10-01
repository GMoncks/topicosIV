import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from app.db.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    type = Column(String(50), nullable=False, index=True)  # ex: friend_request, friend_accepted, achievement_unlocked, wishlist_discount, trade_offer, system
    title = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    payload_json = Column(Text, nullable=True)  # Armazenado como JSON serializado
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    def __init__(self, user_id: int, type: str, title: str, message: str, payload: dict = None, is_read: bool = False, created_at: datetime = None):
        self.user_id = user_id
        self.type = type
        self.title = title
        self.message = message
        self.payload = payload
        self.is_read = is_read
        if created_at:
            self.created_at = created_at

    @property
    def payload(self):
        if not self.payload_json:
            return None
        try:
            return json.loads(self.payload_json)
        except Exception:
            return None

    @payload.setter
    def payload(self, value):
        if value is None:
            self.payload_json = None
        elif isinstance(value, str):
            self.payload_json = value
        else:
            self.payload_json = json.dumps(value, ensure_ascii=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "type": self.type,
            "title": self.title,
            "message": self.message,
            "payload": self.payload,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
