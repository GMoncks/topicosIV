from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    header_url: Optional[str] = None
    category: Optional[str] = "Geral"
    is_private: Optional[bool] = False


class GroupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    header_url: Optional[str] = None
    category: str
    is_private: bool
    owner_id: int
    members_count: int
    posts_count: int
    created_at: datetime
    is_member: Optional[bool] = False
    role: Optional[str] = None


class GroupMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    user_id: int
    role: str
    joined_at: datetime


class GroupMessageCreate(BaseModel):
    content: str


class GroupMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    user_id: int
    username: Optional[str] = None
    content: str
    created_at: datetime
