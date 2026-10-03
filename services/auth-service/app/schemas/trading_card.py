from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.inventory import InventoryItemResponse


class TradingCardResponse(BaseModel):
    id: int
    game_id: int
    card_name: str
    card_art_url: str
    rarity: str
    is_foil: bool
    description: Optional[str] = None

    model_config = {"from_attributes": True}


class BadgeResponse(BaseModel):
    id: int
    game_id: int
    name: str
    description: Optional[str] = None
    xp_value: int
    icon_url: str
    is_foil: bool
    level: int

    model_config = {"from_attributes": True}


class LevelProgressResponse(BaseModel):
    level: int
    total_xp: int
    current_level_min_xp: int
    next_level_min_xp: int
    current_xp_in_level: int
    xp_needed_in_level: int
    progress_percent: float


class CardGrantRequest(BaseModel):
    user_id: int
    game_id: int
    card_id: Optional[int] = None
    is_foil: bool = False
    rarity: Optional[str] = None
    reason: Optional[str] = None


class CardGrantResponse(BaseModel):
    success: bool
    message: str
    inventory_item: InventoryItemResponse
    card: Optional[TradingCardResponse] = None


class CraftBadgeRequest(BaseModel):
    game_id: int
    is_foil: bool = False


class CraftBadgeResponse(BaseModel):
    success: bool
    message: str
    badge: BadgeResponse
    badge_item: InventoryItemResponse
    new_level: int
    new_total_xp: int
    leveled_up: bool
    xp_gained: int
    consumed_cards_count: int
