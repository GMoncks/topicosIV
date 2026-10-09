from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from app.db.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


class SystemReview(Base):
    """
    Avaliação ou feedback da plataforma MIST deixado por um usuário autenticado.
    Registra nome de usuário, data, hora, recomendação e texto com limite de 500 caracteres.
    """
    __tablename__ = "system_reviews"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, index=True, nullable=False)
    username = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    is_recommended = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=_utcnow, nullable=False)
