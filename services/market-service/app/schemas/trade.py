from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.listing import ITEM_TYPES


class TradeItem(BaseModel):
    item_id: int = Field(..., gt=0)
    item_type: str
    item_name: Optional[str] = Field(None, max_length=150)

    @field_validator("item_type")
    @classmethod
    def item_type_must_be_known(cls, value: str) -> str:
        if value not in ITEM_TYPES:
            raise ValueError(f"Tipo de item inválido. Use um de: {sorted(ITEM_TYPES)}")
        return value


class TradeOfferCreate(BaseModel):
    receiver_id: int = Field(..., gt=0)
    offered_items: List[TradeItem] = Field(..., min_length=1)
    requested_items: List[TradeItem] = Field(..., min_length=1)


class TradeOfferResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    offered_items: List[TradeItem]
    requested_items: List[TradeItem]
    status: str
    created_at: datetime
    responded_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TradeOfferPage(BaseModel):
    items: List[TradeOfferResponse]
    total: int
    skip: int
    limit: int
