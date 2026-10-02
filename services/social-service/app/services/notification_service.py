import asyncio
from typing import List, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException, status

from app.models.notification import Notification
from app.services.notification_manager import notification_manager


class NotificationService:
    @staticmethod
    async def create_notification(
        db: Session,
        user_id: int,
        type: str,
        title: str,
        message: str,
        payload: Optional[dict] = None
    ) -> Notification:
        """
        Cria uma notificação no banco de dados e notifica via WebSocket se o usuário estiver online.
        """
        notif = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            payload=payload,
            is_read=False
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)

        # Envia diretamente para o usuário se estiver conectado no WebSocket
        await notification_manager.notify_user(user_id, notif.to_dict())

        return notif

    @staticmethod
    def list_notifications(
        db: Session,
        user_id: int,
        unread_only: bool = False,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[Notification], int, int]:
        """
        Retorna (items, unread_count, total) para o user_id.
        """
        query = db.query(Notification).filter(Notification.user_id == user_id)

        unread_count = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read.is_(False)
        ).count()

        total = query.count()

        if unread_only:
            query = query.filter(Notification.is_read.is_(False))

        items = query.order_by(desc(Notification.created_at)).offset(offset).limit(limit).all()
        return items, unread_count, total

    @staticmethod
    def mark_as_read(db: Session, notification_id: int, user_id: int) -> Notification:
        notif = db.query(Notification).filter(Notification.id == notification_id).first()
        if not notif or notif.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notificação não encontrada."
            )

        notif.is_read = True
        db.commit()
        db.refresh(notif)
        return notif

    @staticmethod
    def mark_all_as_read(db: Session, user_id: int) -> int:
        updated = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read.is_(False)
        ).update({"is_read": True})
        db.commit()
        return updated
