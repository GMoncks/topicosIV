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
    developer = Column(String(100), index=True, nullable=True, default="")
    publisher = Column(String(100), index=True, nullable=False)
    review_score = Column(Float, nullable=False, default=0.0)
    game_file = Column(String(255), nullable=True)
    original_price = Column(Float, nullable=True)
    discount_percentage = Column(Integer, nullable=True, default=0)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "price": self.price,
            "original_price": self.original_price if self.original_price is not None else self.price,
            "discount_percentage": self.discount_percentage if self.discount_percentage is not None else 0,
            "tags": self.tags,
            "category": self.category,
            "banner_url": self.banner_url,
            "screenshots": self.screenshots,
            "release_date": self.release_date.isoformat() if self.release_date else None,
            "developer": self.developer,
            "publisher": self.publisher,
            "review_score": self.review_score,
            "game_file": self.game_file,
        }

