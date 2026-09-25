from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class CheckoutRequest(BaseModel):
    game_id: Optional[int] = Field(None, description="ID de um jogo individual para compra imediata")
    game_ids: Optional[List[int]] = Field(None, description="Lista de IDs de jogos para compra do carrinho")
    idempotency_key: Optional[str] = Field(None, description="Chave de idempotência única opcional")


class CheckoutItem(BaseModel):
    game_id: int
    title: str
    price_paid: float


class CheckoutResponse(BaseModel):
    status: str = "success"
    order_id: str
    items: List[CheckoutItem]
    total_paid: float
    new_wallet_balance: float
    purchased_at: datetime
