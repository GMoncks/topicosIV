from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class GrantRequest(BaseModel):
    user_id: int = Field(..., gt=0, description="ID do usuário comprador/destinatário")
    game_id: int = Field(..., gt=0, description="ID do jogo no catálogo da loja")


class GrantResponse(BaseModel):
    id: int
    user_id: int
    game_id: int
    acquired_at: datetime
    created: bool = Field(..., description="Indica se a licença acabou de ser criada ou se já existia previamente")

    model_config = ConfigDict(from_attributes=True)


class GameEnrichedData(BaseModel):
    title: str = Field(..., description="Título do jogo")
    category: Optional[str] = Field(None, description="Categoria do jogo")
    banner_url: Optional[str] = Field(None, description="URL da arte/banner do jogo")
    publisher: Optional[str] = Field(None, description="Distribuidora/desenvolvedora")


class LibraryItemResponse(BaseModel):
    id: int
    user_id: int
    game_id: int
    acquired_at: datetime
    playtime_minutes: int
    is_installed: bool
    last_played: Optional[datetime] = None
    game: Optional[GameEnrichedData] = Field(None, description="Metadados enriquecidos vindos da store")

    model_config = ConfigDict(from_attributes=True)
