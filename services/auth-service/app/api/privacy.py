from typing import Optional, Literal
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User


router = APIRouter(tags=["Privacy"])


class PrivacySettingsResponse(BaseModel):
    privacy_games: str = "Todos"
    privacy_achievements: str = "Todos"
    privacy_playtime: str = "Todos"
    privacy_inventory: str = "Todos"
    privacy_screenshots: str = "Todos"
    privacy_groups: str = "Todos"

    model_config = {"from_attributes": True}


class PrivacyUpdateRequest(BaseModel):
    privacy_games: Optional[Literal["Todos", "Amigos", "Privado"]] = None
    privacy_achievements: Optional[Literal["Todos", "Amigos", "Privado"]] = None
    privacy_playtime: Optional[Literal["Todos", "Amigos", "Privado"]] = None
    privacy_inventory: Optional[Literal["Todos", "Amigos", "Privado"]] = None
    privacy_screenshots: Optional[Literal["Todos", "Amigos", "Privado"]] = None
    privacy_groups: Optional[Literal["Todos", "Amigos", "Privado"]] = None


@router.get("/me/privacy", response_model=PrivacySettingsResponse, status_code=status.HTTP_200_OK)
def get_privacy_settings(
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """
    Retorna as configurações de privacidade do usuário atual.
    """
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Header X-User-Id ausente ou não autenticado."
        )
    try:
        user_id = int(x_user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID de usuário inválido.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")

    return PrivacySettingsResponse(
        privacy_games=getattr(user, "privacy_games", "Todos") or "Todos",
        privacy_achievements=getattr(user, "privacy_achievements", "Todos") or "Todos",
        privacy_playtime=getattr(user, "privacy_playtime", "Todos") or "Todos",
        privacy_inventory=getattr(user, "privacy_inventory", "Todos") or "Todos",
        privacy_screenshots=getattr(user, "privacy_screenshots", "Todos") or "Todos",
        privacy_groups=getattr(user, "privacy_groups", "Todos") or "Todos",
    )


@router.patch("/me/privacy", response_model=PrivacySettingsResponse, status_code=status.HTTP_200_OK)
def update_privacy_settings(
    payload: PrivacyUpdateRequest,
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """
    Atualiza as opções de visibilidade de seções do perfil do usuário autenticado.
    """
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Header X-User-Id ausente ou não autenticado."
        )
    try:
        user_id = int(x_user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID de usuário inválido.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")

    if payload.privacy_games is not None:
        user.privacy_games = payload.privacy_games
    if payload.privacy_achievements is not None:
        user.privacy_achievements = payload.privacy_achievements
    if payload.privacy_playtime is not None:
        user.privacy_playtime = payload.privacy_playtime
    if payload.privacy_inventory is not None:
        user.privacy_inventory = payload.privacy_inventory
    if payload.privacy_screenshots is not None:
        user.privacy_screenshots = payload.privacy_screenshots
    if payload.privacy_groups is not None:
        user.privacy_groups = payload.privacy_groups

    db.commit()
    db.refresh(user)

    return PrivacySettingsResponse(
        privacy_games=user.privacy_games,
        privacy_achievements=user.privacy_achievements,
        privacy_playtime=user.privacy_playtime,
        privacy_inventory=user.privacy_inventory,
        privacy_screenshots=user.privacy_screenshots,
        privacy_groups=user.privacy_groups,
    )
