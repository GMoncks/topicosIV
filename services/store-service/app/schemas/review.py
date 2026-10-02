from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class ReviewCreate(BaseModel):
    is_recommended: bool = Field(..., description="True = recomenda o jogo; False = não recomenda")
    text: str = Field(..., max_length=2000, description="Texto da avaliação (1 a 2000 caracteres)")

    @field_validator("text")
    @classmethod
    def text_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("O texto da avaliação não pode ser vazio.")
        return value


class ReviewResponse(BaseModel):
    id: int
    user_id: int
    game_id: int
    is_recommended: bool
    text: str
    playtime_at_review: int = Field(..., description="Minutos jogados no momento da avaliação")
    created_at: datetime
    updated_at: datetime
    helpful_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ReviewHelpfulResponse(BaseModel):
    review_id: int
    helpful_count: int
    created: bool = Field(..., description="False quando o usuário já havia votado (operação idempotente)")


class ReviewSummary(BaseModel):
    reviews_count: int = 0
    positive_count: int = 0
    approval_pct: Optional[float] = Field(None, description="Percentual de avaliações positivas (None sem avaliações)")
    approval_label: str = "Sem avaliações"
