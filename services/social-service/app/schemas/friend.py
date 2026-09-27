from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class FriendRequestCreate(BaseModel):
    addressee_id: int = Field(..., description="ID do usuário a quem se destina o pedido de amizade")


class FriendshipResponse(BaseModel):
    id: int
    requester_id: int
    addressee_id: int
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FriendActionResponse(BaseModel):
    success: bool
    message: str
    friendship_id: Optional[int] = None


class FriendListItem(BaseModel):
    friendship_id: int
    friend_user_id: int
    status: str
    since: datetime
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    presence_status: Optional[str] = "offline"
    current_game: Optional[str] = None
    current_game_id: Optional[int] = None
    is_bot: Optional[bool] = False

    model_config = ConfigDict(from_attributes=True)

