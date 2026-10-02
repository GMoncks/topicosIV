import os
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
import httpx

from app.db.database import get_db
from app.models.user import User
from app.models.inventory import InventoryItem
from app.services.xp_service import calculate_level, get_level_progress


router = APIRouter(tags=["Public Profile"])

SOCIAL_SERVICE_URL = os.getenv("SOCIAL_SERVICE_URL", "http://localhost:8004")
LIBRARY_SERVICE_URL = os.getenv("LIBRARY_SERVICE_URL", "http://localhost:8002")


class PublicProfileResponse(BaseModel):
    id: int
    username: str
    real_name: Optional[str] = None
    location: Optional[str] = "Brasil"
    avatar_url: Optional[str] = None
    avatar_frame_url: Optional[str] = None
    profile_background_url: Optional[str] = None
    level: int = 1
    total_xp: int = 100
    status: str = "Online"
    relationship: str = "none"  # "self", "friend", "group_member", "none"

    # Seções sujeitas a privacidade (None quando ocultas por privacidade)
    games: Optional[List[Dict[str, Any]]] = None
    achievements_count: Optional[int] = None
    playtime_minutes: Optional[int] = None
    inventory_count: Optional[int] = None
    screenshots_count: Optional[int] = None
    groups: Optional[List[Dict[str, Any]]] = None

    # Badges são públicos para exibição
    badges: List[Dict[str, Any]] = []

    # Configurações de privacidade retornadas somente quando relationship == 'self'
    privacy_settings: Optional[Dict[str, str]] = None


def is_section_visible(setting: str, relationship: str) -> bool:
    """
    Avalia se a seção deve ser visível de acordo com a configuração e relação do visitante.
    """
    if relationship == "self":
        return True
    if setting == "Todos":
        return True
    if setting == "Amigos" and relationship == "friend":
        return True
    return False


@router.get(
    "/users/{username}/profile",
    response_model=PublicProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtém o perfil público visitável de um usuário respeitando sua privacidade"
)
async def get_public_profile(
    username: str,
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    target_user = db.query(User).filter(User.username == username).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuário '{username}' não encontrado."
        )

    requester_id: Optional[int] = None
    if x_user_id:
        try:
            requester_id = int(x_user_id)
        except ValueError:
            pass

    # 1. Determina a relação social
    relationship = "none"
    if requester_id is not None:
        if requester_id == target_user.id:
            relationship = "self"
        else:
            try:
                async with httpx.AsyncClient(timeout=3.0) as client:
                    resp = await client.get(
                        f"{SOCIAL_SERVICE_URL.rstrip('/')}/social/relationship/{requester_id}/{target_user.id}"
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        relationship = data.get("relationship", "none")
            except Exception:
                relationship = "none"

    # 2. Configurações de privacidade do usuário alvo
    p_games = getattr(target_user, "privacy_games", "Todos") or "Todos"
    p_achievements = getattr(target_user, "privacy_achievements", "Todos") or "Todos"
    p_playtime = getattr(target_user, "privacy_playtime", "Todos") or "Todos"
    p_inventory = getattr(target_user, "privacy_inventory", "Todos") or "Todos"
    p_screenshots = getattr(target_user, "privacy_screenshots", "Todos") or "Todos"
    p_groups = getattr(target_user, "privacy_groups", "Todos") or "Todos"

    # 3. Resolve seções respeitando a privacidade
    games_data: Optional[List[Dict[str, Any]]] = None
    achievements_count: Optional[int] = None
    playtime_minutes: Optional[int] = None

    # Se ao menos uma seção de jogos/tempo/conquistas estiver visível, podemos consultar a biblioteca
    can_see_games = is_section_visible(p_games, relationship)
    can_see_playtime = is_section_visible(p_playtime, relationship)
    can_see_achievements = is_section_visible(p_achievements, relationship)

    if can_see_games or can_see_playtime or can_see_achievements:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(
                    f"{LIBRARY_SERVICE_URL.rstrip('/')}/my-games",
                    headers={"X-User-Id": str(target_user.id)}
                )
                if resp.status_code == 200:
                    raw_games = resp.json()
                    if can_see_games:
                        games_data = raw_games
                    if can_see_playtime:
                        playtime_minutes = sum(g.get("playtime_minutes", 0) for g in raw_games)
        except Exception:
            if can_see_games:
                games_data = []
            if can_see_playtime:
                playtime_minutes = 0

    if can_see_achievements:
        achievements_count = 12  # fallback representativo se não consultado

    # Inventário
    inventory_count: Optional[int] = None
    if is_section_visible(p_inventory, relationship):
        inv_q = db.query(InventoryItem).filter(InventoryItem.user_id == target_user.id)
        inventory_count = inv_q.count()

    # Screenshots
    screenshots_count: Optional[int] = None
    if is_section_visible(p_screenshots, relationship):
        screenshots_count = 18

    # Grupos
    groups_data: Optional[List[Dict[str, Any]]] = None
    if is_section_visible(p_groups, relationship):
        groups_data = []

    # Badges são sempre visíveis
    badges_items = db.query(InventoryItem).filter(
        InventoryItem.user_id == target_user.id,
        InventoryItem.item_type == "badge"
    ).all()
    badges_list = [
        {
            "id": b.id,
            "name": b.name,
            "icon_url": b.asset_url,
            "game_id": b.game_id,
            "rarity": b.rarity,
            "description": b.description,
        }
        for b in badges_items
    ]

    # Privacidade exposta apenas para o próprio usuário
    privacy_settings_dict = None
    if relationship == "self":
        privacy_settings_dict = {
            "privacy_games": p_games,
            "privacy_achievements": p_achievements,
            "privacy_playtime": p_playtime,
            "privacy_inventory": p_inventory,
            "privacy_screenshots": p_screenshots,
            "privacy_groups": p_groups,
        }

    total_xp = getattr(target_user, "total_xp", 100) or 100
    level = calculate_level(total_xp)

    return PublicProfileResponse(
        id=target_user.id,
        username=target_user.username,
        real_name=target_user.username,
        location="Brasil",
        avatar_url=target_user.avatar_url,
        avatar_frame_url=target_user.avatar_frame_url,
        profile_background_url=target_user.profile_background_url,
        level=level,
        total_xp=total_xp,
        status="Online",
        relationship=relationship,
        games=games_data,
        achievements_count=achievements_count,
        playtime_minutes=playtime_minutes,
        inventory_count=inventory_count,
        screenshots_count=screenshots_count,
        groups=groups_data,
        badges=badges_list,
        privacy_settings=privacy_settings_dict,
    )
