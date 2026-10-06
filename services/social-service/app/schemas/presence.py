from typing import Optional
from pydantic import BaseModel, Field


class PresenceUpdateRequest(BaseModel):
    user_id: int
    status: str = Field(..., description="Status de presença: online, away, playing, offline")
    game_id: Optional[int] = None
    game_title: Optional[str] = None


class PresenceResponse(BaseModel):
    user_id: int
    status: str
    game_id: Optional[int] = None
    game_title: Optional[str] = None
    last_seen: Optional[str] = None
