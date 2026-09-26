from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from fastapi import HTTPException, status

from app.models.friend import Friend


class SocialService:
    @staticmethod
    def send_friend_request(db: Session, requester_id: int, addressee_id: int) -> Friend:
        if requester_id == addressee_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não é possível enviar uma solicitação de amizade para você mesmo."
            )

        # Procura qualquer relação existente entre os dois usuários em qualquer direção
        existing = db.query(Friend).filter(
            or_(
                and_(Friend.requester_id == requester_id, Friend.addressee_id == addressee_id),
                and_(Friend.requester_id == addressee_id, Friend.addressee_id == requester_id),
            )
        ).first()

        if existing:
            if existing.status == "accepted":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Vocês já são amigos."
                )
            if existing.status == "pending":
                if existing.requester_id == requester_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Solicitação de amizade já enviada anteriormente e pendente de resposta."
                    )
                else:
                    # O outro usuário já havia enviado solicitação pendente! Aceita automaticamente
                    existing.status = "accepted"
                    existing.updated_at = datetime.now(timezone.utc)
                    db.commit()
                    db.refresh(existing)
                    return existing
            if existing.status in ("rejected", "blocked"):
                # Atualiza para pending com novo requester
                existing.requester_id = requester_id
                existing.addressee_id = addressee_id
                existing.status = "pending"
                existing.updated_at = datetime.now(timezone.utc)
                db.commit()
                db.refresh(existing)
                return existing

        friendship = Friend(
            requester_id=requester_id,
            addressee_id=addressee_id,
            status="pending"
        )
        db.add(friendship)
        db.commit()
        db.refresh(friendship)
        return friendship

    @staticmethod
    def accept_friend_request(db: Session, friendship_id: int, current_user_id: int) -> Friend:
        friendship = db.query(Friend).filter(Friend.id == friendship_id).first()
        if not friendship:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Solicitação de amizade não encontrada."
            )

        if friendship.addressee_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Apenas o destinatário pode aceitar esta solicitação de amizade."
            )

        if friendship.status == "accepted":
            return friendship

        friendship.status = "accepted"
        friendship.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(friendship)
        return friendship

    @staticmethod
    def delete_friendship(db: Session, friendship_id: int, current_user_id: int) -> bool:
        friendship = db.query(Friend).filter(Friend.id == friendship_id).first()
        if not friendship:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Relação de amizade não encontrada."
            )

        if friendship.requester_id != current_user_id and friendship.addressee_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para remover ou recusar esta amizade."
            )

        db.delete(friendship)
        db.commit()
        return True

    @staticmethod
    def list_friends(db: Session, user_id: int) -> List[dict]:
        from app.services.presence_manager import presence_manager

        friendships = db.query(Friend).filter(
            Friend.status == "accepted",
            or_(Friend.requester_id == user_id, Friend.addressee_id == user_id)
        ).all()

        # Mapa de nomes/avatares para exibição amigável
        DEFAULT_PROFILES = {
            1: {"username": "GGTorres2001", "avatar_url": "https://picsum.photos/seed/user1/100/100"},
            2: {"username": "CyberKnight", "avatar_url": "https://picsum.photos/seed/user2/100/100"},
            3: {"username": "Valkyrie", "avatar_url": "https://picsum.photos/seed/user3/100/100"},
            4: {"username": "PixelMage", "avatar_url": "https://picsum.photos/seed/user4/100/100"},
        }

        result = []
        for f in friendships:
            friend_uid = f.addressee_id if f.requester_id == user_id else f.requester_id
            presence = presence_manager.get_user_status(friend_uid)
            profile = DEFAULT_PROFILES.get(friend_uid, {
                "username": f"Gamer_{friend_uid}",
                "avatar_url": f"https://picsum.photos/seed/user{friend_uid}/100/100"
            })

            result.append({
                "friendship_id": f.id,
                "friend_user_id": friend_uid,
                "status": f.status,
                "since": f.updated_at or f.created_at,
                "username": profile.get("username"),
                "avatar_url": profile.get("avatar_url"),
                "presence_status": presence.get("status", "offline"),
                "current_game": presence.get("game_title"),
                "current_game_id": presence.get("game_id"),
            })
        return result

    @staticmethod
    def save_message(db: Session, room_id: str, sender_id: int, content: str) -> dict:
        from app.models.message import Message
        msg = Message(
            room_id=room_id,
            sender_id=sender_id,
            content=content,
            created_at=datetime.now(timezone.utc),
            is_read=False
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)
        return msg.to_dict()

    @staticmethod
    def list_messages(db: Session, room_id: str, limit: int = 50, offset: int = 0) -> List[dict]:
        from app.models.message import Message
        messages = (
            db.query(Message)
            .filter(Message.room_id == room_id)
            .order_by(Message.created_at.asc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return [m.to_dict() for m in messages]

    @staticmethod
    def mark_messages_as_read(db: Session, room_id: str, current_user_id: int) -> int:
        from app.models.message import Message
        # Marca como lidas apenas as mensagens recebidas (onde sender_id != current_user_id)
        updated_count = (
            db.query(Message)
            .filter(
                Message.room_id == room_id,
                Message.sender_id != current_user_id,
                Message.is_read == False
            )
            .update({"is_read": True}, synchronize_session=False)
        )
        db.commit()
        return updated_count

    @staticmethod
    def record_activity(db: Session, user_id: int, activity_type: str, payload: dict) -> dict:
        from app.models.activity import Activity
        activity = Activity(
            user_id=user_id,
            type=activity_type,
            payload=payload,
            created_at=datetime.now(timezone.utc)
        )
        db.add(activity)
        db.commit()
        db.refresh(activity)
        return activity.to_dict()

    @staticmethod
    def list_activities(db: Session, user_id: Optional[int] = None, limit: int = 50) -> List[dict]:
        from app.models.activity import Activity
        query = db.query(Activity)
        if user_id:
            query = query.filter(Activity.user_id == user_id)
        activities = query.order_by(Activity.created_at.desc()).limit(limit).all()
        return [a.to_dict() for a in activities]

