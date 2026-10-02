from sqlalchemy import Column, Integer, String, Boolean
from app.db.database import Base


class TradingCard(Base):
    __tablename__ = "trading_cards"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    game_id = Column(Integer, nullable=False, index=True)
    card_name = Column(String(100), nullable=False)
    card_art_url = Column(String(500), nullable=False)
    rarity = Column(String(50), default="Comum", nullable=False)  # Comum, Incomum, Raro, Lendario
    is_foil = Column(Boolean, default=False, nullable=False)
    description = Column(String(255), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "game_id": self.game_id,
            "card_name": self.card_name,
            "card_art_url": self.card_art_url,
            "rarity": self.rarity,
            "is_foil": self.is_foil,
            "description": self.description,
        }
