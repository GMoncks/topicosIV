from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, Integer, String
from app.db.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


LISTING_STATUSES = {"ativo", "vendido", "cancelado"}

# Mesma taxonomia planejada para o InventoryItem do auth-service (Bloco J, item_type).
ITEM_TYPES = {"card", "emoticon", "background", "avatar_frame", "badge"}


class MarketListing(Base):
    __tablename__ = "market_listings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    seller_id = Column(Integer, index=True, nullable=False)
    item_id = Column(Integer, index=True, nullable=False)
    item_type = Column(String(20), index=True, nullable=False)
    # Snapshot legível do item no momento do anúncio, para exibir na listagem
    # sem precisar de um round-trip ao auth-service a cada consulta (L-04).
    item_name = Column(String(150), nullable=True)
    # Nem todo item cosmético pertence a um jogo específico; usado no filtro "por jogo" (L-04).
    game_id = Column(Integer, index=True, nullable=True)
    price = Column(Float, nullable=False)
    status = Column(String(20), index=True, default="ativo", nullable=False)
    buyer_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=_utcnow, index=True, nullable=False)
    sold_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
