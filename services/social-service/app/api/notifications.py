from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.notification import (
    NotificationCreate,
    NotificationResponse,
    NotificationListResponse,
    NotificationMarkAllResponse,
)
from app.services.notification_service import NotificationService
from app.services.notification_manager import notification_manager

router = APIRouter(tags=["Notifications"])


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


@router.get("/notifications", response_model=NotificationListResponse)
def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    offset: int = 0,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    items, unread_count, total = NotificationService.list_notifications(
        db=db,
        user_id=user_id,
        unread_only=unread_only,
        limit=limit,
        offset=offset
    )
    return {
        "items": [item.to_dict() for item in items],
        "unread_count": unread_count,
        "total": total
    }


@router.post("/notifications", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    payload: NotificationCreate,
    db: Session = Depends(get_db)
):
    notif = await NotificationService.create_notification(
        db=db,
        user_id=payload.user_id,
        type=payload.type,
        title=payload.title,
        message=payload.message,
        payload=payload.payload
    )
    return notif.to_dict()



@router.post("/notifications/{id}/read", response_model=NotificationResponse)
def mark_notification_read(
    id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    notif = NotificationService.mark_as_read(
        db=db,
        notification_id=id,
        user_id=user_id
    )
    return notif.to_dict()


@router.post("/notifications/read-all", response_model=NotificationMarkAllResponse)
def mark_all_notifications_read(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    updated = NotificationService.mark_all_as_read(
        db=db,
        user_id=user_id
    )
    return {
        "status": "success",
        "updated_count": updated
    }


@router.websocket("/ws/notifications")
async def websocket_notifications_endpoint(
    websocket: WebSocket,
    user_id: Optional[int] = None
):
    """
    Endpoint WebSocket para push de notificações em tempo real.
    """
    if not user_id:
        # Tenta obter via query parameter
        try:
            user_id = int(websocket.query_params.get("user_id", "0"))
        except (ValueError, TypeError):
            user_id = 0

    if not user_id:
        await websocket.close(code=1008)
        return

    await notification_manager.connect(websocket, user_id)
    try:
        while True:
            # Mantém a conexão aberta e responde pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        notification_manager.disconnect(websocket)
    except Exception:
        notification_manager.disconnect(websocket)
