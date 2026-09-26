from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class SessionStartRequest(BaseModel):
    user_id: int = Field(..., description="ID do usuário")
    game_id: int = Field(..., description="ID do jogo")
    session_token: Optional[str] = Field(None, description="Token de autenticação ou sessão")


class SessionStartResponse(BaseModel):
    status: str = Field(..., description="Status da sessão ('active')")
    session_id: str = Field(..., description="Identificador único da sessão")
    user_id: int
    game_id: int
    started_at: datetime
    is_installed: bool = True


class SessionPingRequest(BaseModel):
    user_id: int = Field(..., description="ID do usuário")
    game_id: int = Field(..., description="ID do jogo")
    session_id: Optional[str] = Field(None, description="Identificador da sessão")
    session_token: Optional[str] = Field(None, description="Token de sessão")


class SessionPingResponse(BaseModel):
    status: str = Field(..., description="Status do ping ('active')")
    session_id: str
    user_id: int
    game_id: int
    playtime_minutes: int = Field(..., description="Tempo total acumulado de jogo em minutos")
    last_ping_at: datetime


class SessionEndRequest(BaseModel):
    user_id: int = Field(..., description="ID do usuário")
    game_id: int = Field(..., description="ID do jogo")
    session_id: Optional[str] = Field(None, description="Identificador da sessão")
    session_token: Optional[str] = Field(None, description="Token de sessão")


class SessionEndResponse(BaseModel):
    status: str = Field(..., description="Status da sessão ('ended')")
    session_id: str
    user_id: int
    game_id: int
    playtime_minutes: int
    ended_at: datetime
