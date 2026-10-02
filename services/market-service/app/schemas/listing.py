from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.listing import ITEM_TYPES


class MarketListingCreate(BaseModel):
    item_id: int = Field(..., gt=0)
    item_type: str = Field(..., description=f"Um de: {sorted(ITEM_TYPES)}")
    item_name: Optional[str] = Field(None, max_length=150)
    game_id: Optional[int] = Field(None, gt=0)
    price: float = Field(..., gt=0)

    @field_validator("item_type")
    @classmethod
    def item_type_must_be_known(cls, value: str) -> str:
        if value not in ITEM_TYPES:
            raise ValueError(f"Tipo de item inválido. Use um de: {sorted(ITEM_TYPES)}")
        return value


class MarketListingResponse(BaseModel):
    id: int
    seller_id: int
    item_id: int
    item_type: str
    item_name: Optional[str] = None
    game_id: Optional[int] = None
    price: float
    status: str
    buyer_id: Optional[int] = None
    created_at: datetime
    sold_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class MarketListingPage(BaseModel):
    items: List[MarketListingResponse]
    total: int
    skip: int
    limit: int


class MarketBuyResponse(BaseModel):
    listing: MarketListingResponse
    new_wallet_balance: Optional[float] = None
