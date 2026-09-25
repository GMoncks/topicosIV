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
        friendships = db.query(Friend).filter(
            Friend.status == "accepted",
            or_(Friend.requester_id == user_id, Friend.addressee_id == user_id)
        ).all()

        result = []
        for f in friendships:
            friend_uid = f.addressee_id if f.requester_id == user_id else f.requester_id
            result.append({
                "friendship_id": f.id,
                "friend_user_id": friend_uid,
                "status": f.status,
                "since": f.updated_at or f.created_at
            })
        return result

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

