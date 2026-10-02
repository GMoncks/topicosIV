from sqlalchemy import Column, Integer, String, Boolean
from app.db.database import Base


class Badge(Base):
    __tablename__ = "badges"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    game_id = Column(Integer, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    xp_value = Column(Integer, default=100, nullable=False)
    icon_url = Column(String(500), nullable=False)
    is_foil = Column(Boolean, default=False, nullable=False)
    level = Column(Integer, default=1, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "game_id": self.game_id,
            "name": self.name,
            "description": self.description,
            "xp_value": self.xp_value,
            "icon_url": self.icon_url,
            "is_foil": self.is_foil,
            "level": self.level,
        }
