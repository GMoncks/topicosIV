from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class PointsCreditRequest(BaseModel):
    amount: int = Field(..., gt=0, description="Quantidade de Pontos MIST a creditar")
    reason: Optional[str] = Field(None, description="Motivo ou transação de origem do crédito")


class PointsOperationResponse(BaseModel):
    user_id: int
    previous_balance: int
    amount: int
    new_balance: int
    operation: str = "credit"


class PointsShopItemResponse(BaseModel):
    id: str
    name: str
    category: str
    item_type: str
    price_points: int
    asset_url: str
    description: Optional[str] = None
    is_owned: bool = False


class InventoryItemResponse(BaseModel):
    id: int
    user_id: int
    item_id: str
    name: str
    item_type: str
    asset_url: str
    price_points: int
    is_equipped: bool
    acquired_at: datetime

    model_config = {"from_attributes": True}


class PointsPurchaseRequest(BaseModel):
    item_id: str = Field(..., min_length=1, description="Identificador do item no catálogo da Loja de Pontos")


class PointsPurchaseResponse(BaseModel):
    success: bool
    message: str
    item: InventoryItemResponse
    new_points_balance: int


class CosmeticEquipRequest(BaseModel):
    inventory_item_id: int = Field(..., description="ID do item no inventário do usuário")
    action: Optional[str] = Field("equip", description="'equip' para equipar ou 'unequip' para desequipar")


class CosmeticEquipResponse(BaseModel):
    success: bool
    message: str
    equipped_item: InventoryItemResponse
    avatar_frame_url: Optional[str] = None
    profile_background_url: Optional[str] = None


class InventoryListResponse(BaseModel):
    items: List[InventoryItemResponse]
    total: int
