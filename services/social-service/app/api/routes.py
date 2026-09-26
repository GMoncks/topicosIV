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


# ==============================================================================
# WEBSOCKET & REST CHAT (F-03 & F-07)
# ==============================================================================
from fastapi import WebSocket, WebSocketDisconnect, Query
from app.services.chat_manager import chat_manager
from app.services.presence_manager import presence_manager
from app.schemas.presence import PresenceUpdateRequest, PresenceResponse
from app.schemas.message import MessageResponse


def resolve_ws_user_id(token: Optional[str] = None, user_id: Optional[int] = None) -> int:
    if user_id:
        return user_id
    if token:
        try:
            import jwt
            payload = jwt.decode(token, "mist_super_secret_jwt_key_development_secret_32bytes", algorithms=["HS256"])
            return int(payload.get("sub", 1))
        except Exception:
            pass
    return 1


@router.websocket("/ws/chat/{room_id}")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    room_id: str,
    token: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Endpoint WebSocket de chat em tempo real por sala/amigo (F-03).
    Suporta mensagens e indicador de digitação (typing indicator).
    """
    current_user_id = resolve_ws_user_id(token=token, user_id=user_id)
    await chat_manager.connect(room_id, websocket, current_user_id)
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "message")
            if msg_type == "message":
                content = (data.get("content") or "").strip()
                if content:
                    sender_id = data.get("sender_id", current_user_id)
                    saved_msg = SocialService.save_message(db, room_id, sender_id, content)
                    broadcast_payload = {
                        "type": "message",
                        **saved_msg
                    }
                    await chat_manager.broadcast_message(room_id, broadcast_payload)
            elif msg_type == "typing":
                is_typing = bool(data.get("is_typing", False))
                await chat_manager.broadcast_typing(room_id, current_user_id, is_typing, exclude=websocket)
            elif msg_type == "read":
                SocialService.mark_messages_as_read(db, room_id, current_user_id)
    except WebSocketDisconnect:
        chat_manager.disconnect(room_id, websocket)


@router.get("/chat/{room_id}/messages", response_model=List[MessageResponse], status_code=status.HTTP_200_OK)
@router.get("/social/chat/{room_id}/messages", response_model=List[MessageResponse], status_code=status.HTTP_200_OK)
def get_chat_messages(
    room_id: str,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Recupera o histórico paginado de mensagens de uma sala de chat (F-07).
    """
    return SocialService.list_messages(db=db, room_id=room_id, limit=limit, offset=offset)


@router.post("/chat/{room_id}/read", status_code=status.HTTP_200_OK)
@router.post("/social/chat/{room_id}/read", status_code=status.HTTP_200_OK)
def mark_chat_read(
    room_id: str,
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Marca como lidas as mensagens recebidas na sala de conversa especificada.
    """
    user_id = int(x_user_id) if x_user_id else 1
    updated = SocialService.mark_messages_as_read(db=db, room_id=room_id, current_user_id=user_id)
    return {"success": True, "marked_read": updated}


# ==============================================================================
# WEBSOCKET & REST PRESENÇA (F-04, F-05 & F-08)
# ==============================================================================
@router.websocket("/ws/presence")
async def websocket_presence_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
):
    """
    Endpoint WebSocket de presença (F-04).
    Notifica status Online / Ausente / Jogando em tempo real.
    """
    current_user_id = resolve_ws_user_id(token=token, user_id=user_id)
    await presence_manager.connect(websocket, current_user_id)
    try:
        while True:
            data = await websocket.receive_json()
            req_type = data.get("type")
            if req_type == "set_status":
                new_status = data.get("status", "online")
                game_id = data.get("game_id")
                game_title = data.get("game_title")
                await presence_manager.update_status(current_user_id, new_status, game_id, game_title)
            elif req_type == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        await presence_manager.disconnect(websocket)


@router.get("/presence", response_model=List[PresenceResponse], status_code=status.HTTP_200_OK)
@router.get("/social/presence", response_model=List[PresenceResponse], status_code=status.HTTP_200_OK)
def get_presence_snapshot():
    """
    Retorna o snapshot de presença de todos os usuários rastreados atualmente.
    """
    return presence_manager.get_snapshot()


@router.post("/presence/status", status_code=status.HTTP_200_OK)
@router.post("/social/presence/status", status_code=status.HTTP_200_OK)
async def update_presence_status(payload: PresenceUpdateRequest):
    """
    Endpoint REST interno para atualização de presença.
    Acionado pelo library-service quando o usuário inicia ou finaliza sessão de jogo (F-05).
    """
    await presence_manager.update_status(
        user_id=payload.user_id,
        status=payload.status,
        game_id=payload.game_id,
        game_title=payload.game_title
    )
    return {"success": True, "presence": presence_manager.get_user_status(payload.user_id)}

