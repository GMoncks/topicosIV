from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class ScreenshotResponse(BaseModel):
    id: int
    user_id: int
    username: Optional[str] = None
    game_id: int
    game_title: Optional[str] = None
    title: Optional[str] = None
    caption: Optional[str] = None
    filename: str
    file_url: str
    file_size: int = 0
    width: int = 1920
    height: int = 1080
    likes_count: int = 0
    liked_by_me: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScreenshotPageResponse(BaseModel):
    items: List[ScreenshotResponse]
    total: int
    skip: int
    limit: int


class ScreenshotLikeResponse(BaseModel):
    screenshot_id: int
    likes_count: int
    liked: bool
