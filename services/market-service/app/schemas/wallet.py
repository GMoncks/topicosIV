from datetime import datetime
from typing import List
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.transaction import TRANSACTION_TYPES


class WalletTransactionCreate(BaseModel):
    """Payload do endpoint interno usado por outros microsserviços (ex.: store-service)."""

    user_id: int = Field(..., gt=0)
    type: str = Field(..., description=f"Um de: {sorted(TRANSACTION_TYPES)}")
    amount: float = Field(..., gt=0, description="Magnitude positiva; a direção depende do tipo")
    description: str = Field(..., min_length=1, max_length=500)

    @field_validator("type")
    @classmethod
    def type_must_be_known(cls, value: str) -> str:
        if value not in TRANSACTION_TYPES:
            raise ValueError(f"Tipo de transação inválido. Use um de: {sorted(TRANSACTION_TYPES)}")
        return value

    @field_validator("description")
    @classmethod
    def description_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("A descrição não pode ser vazia.")
        return value


class WalletTransactionResponse(BaseModel):
    id: int
    user_id: int
    type: str
    amount: float
    direction: str = Field(..., description="'credit' (entra) ou 'debit' (sai)")
    description: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WalletHistoryResponse(BaseModel):
    items: List[WalletTransactionResponse]
    total: int
    skip: int
    limit: int
