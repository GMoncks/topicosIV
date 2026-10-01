from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Integer, String, UniqueConstraint, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


class Screenshot(Base):
    __tablename__ = "screenshots"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, index=True, nullable=False)
    username = Column(String(100), nullable=True)
    game_id = Column(Integer, index=True, nullable=False)
    game_title = Column(String(150), nullable=True)
    title = Column(String(150), nullable=True)
    caption = Column(String(500), nullable=True)
    filename = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_size = Column(Integer, default=0, nullable=False)
    width = Column(Integer, default=1920, nullable=False)
    height = Column(Integer, default=1080, nullable=False)
    likes_count = Column(Integer, default=0, index=True, nullable=False)
    created_at = Column(DateTime, default=_utcnow, index=True, nullable=False)

    likes = relationship("ScreenshotLike", back_populates="screenshot", cascade="all, delete-orphan")


class ScreenshotLike(Base):
    __tablename__ = "screenshot_likes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    screenshot_id = Column(Integer, ForeignKey("screenshots.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, default=_utcnow, nullable=False)

    screenshot = relationship("Screenshot", back_populates="likes")

    __table_args__ = (
        UniqueConstraint("screenshot_id", "user_id", name="uq_screenshot_user_like"),
    )
