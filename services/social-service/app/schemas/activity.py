from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class ActivityCreate(BaseModel):
    user_id: int = Field(..., description="ID do usuário autor da atividade")
    type: str = Field(..., description="Tipo da atividade (ex: achievement_unlocked, game_purchased)")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Dados contextuais da atividade")


class ActivityResponse(BaseModel):
    id: int
    user_id: int
    type: str
    payload: Dict[str, Any]
    created_at: Optional[str] = None
