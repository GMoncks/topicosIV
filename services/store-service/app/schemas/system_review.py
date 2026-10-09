from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class SystemReviewCreate(BaseModel):
    content: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Texto do review ou feedback sobre a plataforma MIST (máximo de 500 caracteres)"
    )
    is_recommended: bool = Field(
        default=True,
        description="Indica se o usuário recomenda a plataforma MIST"
    )


class SystemReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    username: str
    content: str
    is_recommended: bool
    created_at: datetime
