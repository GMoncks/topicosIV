from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.friend import (
    FriendRequestCreate,
    FriendActionResponse,
    FriendshipResponse,
    FriendListItem,
)
from app.services.social_service import SocialService

router = APIRouter(tags=["Social"])


def get_current_user_id(x_user_id: Optional[str] = Header(None)) -> int:
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Header X-User-Id ausente ou não autenticado."
        )
    try:
        return int(x_user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Header X-User-Id deve ser um número inteiro."
        )


@router.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    return {"status": "healthy", "service": "social-service"}


@router.post("/friends/request", response_model=FriendshipResponse, status_code=status.HTTP_201_CREATED)
def request_friend(
    payload: FriendRequestCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Envia uma solicitação de amizade para o usuário informado em addressee_id.
    """
    friendship = SocialService.send_friend_request(
        db=db,
        requester_id=user_id,
        addressee_id=payload.addressee_id
    )
    return friendship


@router.post("/friends/accept/{id}", response_model=FriendshipResponse, status_code=status.HTTP_200_OK)
def accept_friend(
    id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Aceita uma solicitação de amizade pendente pelo ID da relação.
    Apenas o destinatário do convite tem permissão para aceitar.
    """
    friendship = SocialService.accept_friend_request(
        db=db,
        friendship_id=id,
        current_user_id=user_id
    )
    return friendship


@router.delete("/friends/{id}", response_model=FriendActionResponse, status_code=status.HTTP_200_OK)
def delete_friend(
    id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Remove uma amizade ou rejeita uma solicitação pendente pelo ID da relação.
    """
    SocialService.delete_friendship(
        db=db,
        friendship_id=id,
        current_user_id=user_id
    )
    return {
        "success": True,
        "message": "Amizade ou solicitação removida com sucesso.",
        "friendship_id": id
    }


@router.get("/friends", response_model=List[FriendListItem], status_code=status.HTTP_200_OK)
def list_friends(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Lista todos os amigos confirmados (status accepted) do usuário autenticado.
    """
    return SocialService.list_friends(db=db, user_id=user_id)
