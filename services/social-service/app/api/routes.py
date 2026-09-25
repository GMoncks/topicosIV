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


from app.schemas.activity import ActivityCreate, ActivityResponse


@router.post("/activities", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
@router.post("/social/activities", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
def create_activity(
    payload: ActivityCreate,
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Registra um novo evento de atividade (desbloqueio de conquista, compra, etc.).
    Pode ser acionado internamente por outros microsserviços (ex: library-service).
    """
    user_id = payload.user_id
    if x_user_id:
        try:
            user_id = int(x_user_id)
        except ValueError:
            pass

    activity = SocialService.record_activity(
        db=db,
        user_id=user_id,
        activity_type=payload.type,
        payload=payload.payload
    )
    return activity


@router.get("/activities", response_model=List[ActivityResponse], status_code=status.HTTP_200_OK)
@router.get("/social/activities", response_model=List[ActivityResponse], status_code=status.HTTP_200_OK)
@router.get("/feed", response_model=List[ActivityResponse], status_code=status.HTTP_200_OK)
@router.get("/social/feed", response_model=List[ActivityResponse], status_code=status.HTTP_200_OK)
def get_activities(
    user_id: Optional[int] = None,
    x_user_id: Optional[str] = Header(None),
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Retorna o feed de atividades recentes. Se user_id for especificado (ou via X-User-Id),
    filtra por esse usuário; caso contrário, retorna as atividades globais.
    """
    effective_user_id = user_id
    if effective_user_id is None and x_user_id:
        try:
            effective_user_id = int(x_user_id)
        except ValueError:
            pass

    return SocialService.list_activities(db=db, user_id=effective_user_id, limit=limit)

