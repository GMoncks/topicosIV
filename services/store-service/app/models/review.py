from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Text, UniqueConstraint
from app.db.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, index=True, nullable=False)
    game_id = Column(Integer, index=True, nullable=False)
    is_recommended = Column(Boolean, nullable=False)
    text = Column(Text, nullable=False)
    playtime_at_review = Column(Integer, default=0, nullable=False)  # minutos jogados no momento da avaliação
    created_at = Column(DateTime, default=_utcnow, nullable=False)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "game_id", name="uq_review_user_game"),
    )


class ReviewVote(Base):
    """Voto de 'útil' de um usuário em um review (no máximo um por par review/usuário)."""

    __tablename__ = "review_votes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    review_id = Column(Integer, ForeignKey("reviews.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(Integer, index=True, nullable=False)
    created_at = Column(DateTime, default=_utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("review_id", "user_id", name="uq_review_vote_review_user"),
    )
