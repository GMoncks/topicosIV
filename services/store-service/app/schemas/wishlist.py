from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.schemas.game import GameListItemResponse

class WishlistItemResponse(BaseModel):
    id: int
    user_id: int
    game_id: int
    added_at: datetime
    game: Optional[GameListItemResponse] = None

    model_config = ConfigDict(from_attributes=True)

class WishlistAddResponse(BaseModel):
    id: int
    user_id: int
    game_id: int
    added_at: datetime
    created: bool

    model_config = ConfigDict(from_attributes=True)
