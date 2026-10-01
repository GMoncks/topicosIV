from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class WorkshopItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    game_id: int
    game_title: Optional[str] = None
    author_id: int
    author_name: str
    author_avatar: Optional[str] = None
    title: str
    description: Optional[str] = None
    category: str
    tags: List[str] = Field(default_factory=list)
    file_url: str
    filename: str
    file_size: int
    preview_url: Optional[str] = None
    version: str = "1.0.0"
    downloads_count: int = 0
    subscriptions_count: int = 0
    rating: float = 5.0
    is_subscribed: bool = False
    created_at: datetime
    updated_at: datetime


class WorkshopPageResponse(BaseModel):
    items: List[WorkshopItemResponse]
    total: int
    skip: int = 0
    limit: int = 20
    page: int = 1
    pages: int = 1


class WorkshopSubscribeResponse(BaseModel):
    item_id: int
    subscribed: bool
    subscriptions_count: int
