from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class MessageCreate(BaseModel):
    room_id: str = Field(..., max_length=100, description="Identificador da sala de conversa")
    content: str = Field(..., min_length=1, max_length=2000, description="Conteúdo textual da mensagem")


class MessageResponse(BaseModel):
    id: int
    room_id: str
    sender_id: int
    content: str
    created_at: datetime
    is_read: bool

    model_config = ConfigDict(from_attributes=True)
