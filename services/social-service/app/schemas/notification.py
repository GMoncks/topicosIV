from typing import Optional, Dict, Any, List
from pydantic import BaseModel


class NotificationCreate(BaseModel):
    user_id: int
    type: str
    title: str
    message: str
    payload: Optional[Dict[str, Any]] = None


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    message: str
    payload: Optional[Dict[str, Any]] = None
    is_read: bool
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    items: List[NotificationResponse]
    unread_count: int
    total: int


class NotificationMarkAllResponse(BaseModel):
    status: str
    updated_count: int
