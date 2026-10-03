from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class ForumReplyCreate(BaseModel):
    content: str


class ForumReplyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    post_id: int
    author_id: int
    content: str
    created_at: datetime


class ForumPostCreate(BaseModel):
    title: str
    content: str
    is_pinned: Optional[bool] = False


class ForumPostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_pinned: Optional[bool] = None
    is_locked: Optional[bool] = None


class ForumPostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    author_id: int
    title: str
    content: str
    is_pinned: bool
    is_locked: bool
    views_count: int
    replies_count: int
    created_at: datetime
    updated_at: datetime


class ForumPostDetailResponse(ForumPostResponse):
    replies: List[ForumReplyResponse] = []
