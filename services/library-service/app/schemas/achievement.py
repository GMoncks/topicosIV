from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class AchievementBase(BaseModel):
    game_id: int
    achievement_id: str
    name: str
    description: Optional[str] = None
    icon_url: Optional[str] = None
    rarity: str

class AchievementResponse(AchievementBase):
    id: int
    is_unlocked: bool = False
    unlocked_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
