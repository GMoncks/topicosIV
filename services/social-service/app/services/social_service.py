import os
from datetime import datetime, timezone
from typing import List, Optional
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from fastapi import HTTPException, status

from app.models.friend import Friend

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8001")


def fetch_user_profile_sync(user_id: int) -> dict:
    """
    Recupera dados cadastrais reais do usuário diretamente do auth-service.
    Possui fallback robusto para testes e ambientes desconectados.
    """
    endpoints = [
        f"{AUTH_SERVICE_URL}/users/{user_id}",
        f"http://localhost:8001/users/{user_id}"
    ]
    for url in endpoints:
        try:
            with httpx.Client(timeout=1.5) as client:
                resp = client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    return {
                        "username": data.get("username") or f"Gamer_{user_id}",
                        "avatar_url": data.get("avatar_url") or f"https://picsum.photos/seed/user{user_id}/100/100",
                        "avatar_frame_url": data.get("avatar_frame_url"),
                        "display_name": data.get("display_name") or data.get("username") or f"Gamer_{user_id}"
                    }
        except Exception:
            continue

    DEFAULT_PROFILES = {
        1: {"username": "GGTorres2001", "avatar_url": "https://picsum.photos/seed/user1/100/100", "avatar_frame_url": None},
        2: {"username": "CyberKnight", "avatar_url": "https://picsum.photos/seed/user2/100/100", "avatar_frame_url": None},
        3: {"username": "Valkyrie", "avatar_url": "https://picsum.photos/seed/user3/100/100", "avatar_frame_url": None},
        4: {"username": "PixelMage", "avatar_url": "https://picsum.photos/seed/user4/100/100", "avatar_frame_url": None},
    }
    return DEFAULT_PROFILES.get(user_id, {
        "username": f"Gamer_{user_id}",
        "avatar_url": f"https://picsum.photos/seed/user{user_id}/100/100",
        "avatar_frame_url": None,
        "display_name": f"Gamer_{user_id}"
    })


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

        # Dispara notificação push de solicitação de amizade para o destinatário
        try:
            from app.models.notification import Notification
            from app.services.notification_manager import notification_manager
            import asyncio

            req_profile = fetch_user_profile_sync(requester_id)
            notif = Notification(
                user_id=addressee_id,
                type="friend_request",
                title="Novo Pedido de Amizade",
                message=f"{req_profile.get('username')} enviou uma solicitação de amizade para você.",
                payload={
                    "friendship_id": friendship.id,
                    "requester_id": requester_id,
                    "requester_username": req_profile.get("username"),
                    "action_route": "social"
                },
                is_read=False
            )
            db.add(notif)
            db.commit()

            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    loop.create_task(notification_manager.notify_user(addressee_id, notif.to_dict()))
            except Exception:
                pass
        except Exception:
            pass

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

        result = []
        for f in friendships:
            friend_uid = f.addressee_id if f.requester_id == user_id else f.requester_id
            presence = presence_manager.get_user_status(friend_uid)
            profile = fetch_user_profile_sync(friend_uid)

            result.append({
                "friendship_id": f.id,
                "friend_user_id": friend_uid,
                "status": f.status,
                "since": f.updated_at or f.created_at,
                "username": profile.get("username"),
                "avatar_url": profile.get("avatar_url"),
                "avatar_frame_url": profile.get("avatar_frame_url"),
                "presence_status": presence.get("status", "offline"),
                "current_game": presence.get("game_title"),
                "current_game_id": presence.get("game_id"),
                "is_bot": False,
            })

        # MIST Companion Bot (G-04): contato virtual inteligente fixo
        bot_entry = {
            "friendship_id": 0,
            "friend_user_id": 0,
            "status": "accepted",
            "since": datetime(2026, 1, 1, tzinfo=timezone.utc),
            "username": "MIST Bot",
            "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=mistbot",
            "avatar_frame_url": None,
            "presence_status": "online",
            "current_game": "MIST AI Companion",
            "current_game_id": 0,
            "is_bot": True,
        }
        result.insert(0, bot_entry)
        return result

    @staticmethod
    def list_friend_requests(db: Session, user_id: int) -> List[dict]:
        """
        Lista todas as solicitações de amizade pendentes recebidas pelo usuário logado (addressee_id == user_id).
        """
        requests = db.query(Friend).filter(
            Friend.addressee_id == user_id,
            Friend.status == "pending"
        ).order_by(Friend.created_at.desc()).all()

        result = []
        for r in requests:
            requester_profile = fetch_user_profile_sync(r.requester_id)
            result.append({
                "friendship_id": r.id,
                "requester_id": r.requester_id,
                "addressee_id": r.addressee_id,
                "status": r.status,
                "created_at": r.created_at,
                "username": requester_profile.get("username"),
                "avatar_url": requester_profile.get("avatar_url"),
                "avatar_frame_url": requester_profile.get("avatar_frame_url"),
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

        # Deduplicação inteligente de conquistas e compras repetidas
        if activity_type == "achievement_unlocked":
            ach_id = payload.get("achievement_id") or payload.get("id") or payload.get("name")
            gid = payload.get("game_id")
            existing = db.query(Activity).filter(
                Activity.user_id == user_id,
                Activity.type == "achievement_unlocked"
            ).all()
            for act in existing:
                p = act.payload if isinstance(act.payload, dict) else {}
                existing_ach_id = p.get("achievement_id") or p.get("id") or p.get("name")
                existing_gid = p.get("game_id")
                if existing_ach_id == ach_id and (gid is None or existing_gid == gid):
                    return act.to_dict()
        elif activity_type == "game_purchased":
            gid = payload.get("game_id")
            existing = db.query(Activity).filter(
                Activity.user_id == user_id,
                Activity.type == "game_purchased"
            ).all()
            for act in existing:
                p = act.payload if isinstance(act.payload, dict) else {}
                if p.get("game_id") == gid:
                    return act.to_dict()

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
        raw_activities = query.order_by(Activity.created_at.desc()).limit(limit * 3).all()

        dedup_list = []
        seen_keys = set()

        for a in raw_activities:
            p = a.payload if isinstance(a.payload, dict) else {}
            # Ignora atividades mockadas com jogos inexistentes
            game_title = str(p.get("game_title") or p.get("game") or "").lower()
            if "space marine" in game_title:
                continue

            # Chave única de deduplicação por tipo de atividade
            ach_key = str(p.get("achievement_id") or p.get("achievement_name") or p.get("name") or "").lower().strip()
            game_key = str(p.get("game_id") or p.get("game_title") or "").lower().strip()
            dedup_key = f"{a.user_id}:{a.type}:{game_key}:{ach_key}"

            if dedup_key in seen_keys:
                continue

            seen_keys.add(dedup_key)
            dedup_list.append(a.to_dict())

            if len(dedup_list) >= limit:
                break

        return dedup_list

    @staticmethod
    def check_relationship(db: Session, user_id_a: int, user_id_b: int) -> str:
        """
        Determina a relação entre dois usuários:
        'self', 'friend', 'group_member', ou 'none'.
        """
        if user_id_a == user_id_b:
            return "self"

        # Verifica se são amigos confirmados
        friendship = db.query(Friend).filter(
            or_(
                and_(Friend.requester_id == user_id_a, Friend.addressee_id == user_id_b),
                and_(Friend.requester_id == user_id_b, Friend.addressee_id == user_id_a),
            ),
            Friend.status == "accepted"
        ).first()

        if friendship:
            return "friend"

        # Verifica se compartilham algum grupo
        try:
            from app.models.group import GroupMember
            member_a_groups = db.query(GroupMember.group_id).filter(GroupMember.user_id == user_id_a).subquery()
            shared = db.query(GroupMember).filter(
                GroupMember.user_id == user_id_b,
                GroupMember.group_id.in_(member_a_groups)
            ).first()
            if shared:
                return "group_member"
        except Exception:
            pass

        return "none"

