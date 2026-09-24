from sqlalchemy import Column, Integer, String, Float, Text, Date, JSON
from app.db.database import Base


class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(150), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=False)
    price = Column(Float, nullable=False)
    tags = Column(JSON, nullable=False, default=list)
    category = Column(String(50), index=True, nullable=False)
    banner_url = Column(String(500), nullable=False)
    screenshots = Column(JSON, nullable=False, default=list)
    release_date = Column(Date, index=True, nullable=False)
    publisher = Column(String(100), index=True, nullable=False)
    review_score = Column(Float, nullable=False, default=0.0)
    game_file = Column(String(255), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "price": self.price,
            "tags": self.tags,
            "category": self.category,
            "banner_url": self.banner_url,
            "screenshots": self.screenshots,
            "release_date": self.release_date.isoformat() if self.release_date else None,
            "publisher": self.publisher,
            "review_score": self.review_score,
            "game_file": self.game_file,
        }
