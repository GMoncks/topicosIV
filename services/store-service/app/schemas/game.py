from datetime import date
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class GameBase(BaseModel):
    title: str = Field(..., max_length=150, description="Título do jogo")
    description: str = Field(..., description="Descrição detalhada ou sinopse do jogo")
    price: float = Field(..., ge=0.0, description="Preço do jogo em R$")
    tags: List[str] = Field(default_factory=list, description="Lista de tags/gêneros do jogo")
    category: str = Field(..., max_length=50, description="Categoria principal")
    banner_url: str = Field(..., description="URL da imagem de banner/capa")
    screenshots: List[str] = Field(default_factory=list, description="Lista de URLs com capturas de tela")
    release_date: date = Field(..., description="Data de lançamento")
    publisher: str = Field(..., max_length=100, description="Desenvolvedora ou distribuidora")
    review_score: float = Field(default=0.0, ge=0.0, le=10.0, description="Pontuação de avaliação (0.0 a 10.0)")
    game_file: Optional[str] = Field(default=None, description="Caminho relativo para o executável Python do jogo")


class GameCreate(GameBase):
    pass


class GameUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    tags: Optional[List[str]] = None
    category: Optional[str] = None
    banner_url: Optional[str] = None
    screenshots: Optional[List[str]] = None
    release_date: Optional[date] = None
    publisher: Optional[str] = None
    review_score: Optional[float] = None
    game_file: Optional[str] = None


class GameListItemResponse(BaseModel):
    id: int
    title: str
    price: float
    tags: List[str]
    category: str
    banner_url: str
    release_date: date
    publisher: str
    review_score: float
    game_file: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class GameDetailResponse(BaseModel):
    id: int
    title: str
    description: str
    price: float
    tags: List[str]
    category: str
    banner_url: str
    screenshots: List[str]
    release_date: date
    publisher: str
    review_score: float
    game_file: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
