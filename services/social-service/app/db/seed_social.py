import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.activity import Activity
from app.models.friend import Friend
from app.models.message import Message

logger = logging.getLogger(__name__)


def seed_social_data(db: Session):
    now = datetime.now(timezone.utc)

    # 1. Seed de Amizades se não existirem
    existing_friends_count = db.query(Friend).count()
    if existing_friends_count == 0:
        logger.info("Populando dados iniciais de amizade no social-service...")
        friends = [
            Friend(
                requester_id=1,
                addressee_id=2,
                status="accepted",
                created_at=now - timedelta(days=5),
                updated_at=now - timedelta(days=5),
            ),
            Friend(
                requester_id=3,
                addressee_id=1,
                status="accepted",
                created_at=now - timedelta(days=3),
                updated_at=now - timedelta(days=3),
            ),
            Friend(
                requester_id=1,
                addressee_id=4,
                status="accepted",
                created_at=now - timedelta(days=1),
                updated_at=now - timedelta(days=1),
            ),
        ]
        db.add_all(friends)
        db.commit()

    # 2. Seed de Mensagens de Chat se não existirem
    existing_messages_count = db.query(Message).count()
    if existing_messages_count == 0:
        logger.info("Populando histórico inicial de mensagens de chat...")
        sample_messages = [
            Message(
                room_id="direct_1_2",
                sender_id=2,
                content="E aí Gabriel! Bora fechar aquele esquadrão no Helldivers mais tarde?",
                created_at=now - timedelta(hours=2),
                is_read=True,
            ),
            Message(
                room_id="direct_1_2",
                sender_id=1,
                content="Com certeza! Só terminar de baixar a atualização aqui no MIST.",
                created_at=now - timedelta(hours=1, minutes=45),
                is_read=True,
            ),
            Message(
                room_id="direct_1_2",
                sender_id=2,
                content="Fechou, me avisa assim que estiver pronto!",
                created_at=now - timedelta(hours=1, minutes=30),
                is_read=True,
            ),
            Message(
                room_id="direct_1_3",
                sender_id=3,
                content="Parabéns pelas novas conquistas que vi no seu feed!",
                created_at=now - timedelta(minutes=45),
                is_read=False,
            ),
        ]
        db.add_all(sample_messages)
        db.commit()

    # 3. Saneamento e Purga de Atividades Duplicadas / Inválidas
    all_activities = db.query(Activity).order_by(Activity.id.desc()).all()
    seen_activity_keys = set()
    to_delete_ids = []

    for act in all_activities:
        p = act.payload if isinstance(act.payload, dict) else {}
        game_title = str(p.get("game_title") or p.get("game") or "").lower()

        # Remove atividades falsas de jogos inexistentes (Space Marine 2, etc.)
        if "space marine" in game_title:
            to_delete_ids.append(act.id)
            continue

        # Corrige registros de Primeira Palavra com game_id 13 (era MIST Forca antes da sincronização)
        ach_id = p.get("achievement_id") or p.get("name")
        if ach_id == "first_word" and p.get("game_id") == 13:
            p["game_id"] = 14
            p["game_title"] = "MIST Forca"
            act.payload = p

        ach_key = str(p.get("achievement_id") or p.get("achievement_name") or p.get("name") or "").lower().strip()
        game_key = str(p.get("game_id") or p.get("game_title") or "").lower().strip()
        dedup_key = f"{act.user_id}:{act.type}:{game_key}:{ach_key}"

        if dedup_key in seen_activity_keys:
            to_delete_ids.append(act.id)
        else:
            seen_activity_keys.add(dedup_key)

    if to_delete_ids:
        db.query(Activity).filter(Activity.id.in_(to_delete_ids)).delete(synchronize_session=False)
        db.commit()

    # 4. Seed de Atividades Canônicas se o feed estiver vazio
    existing_activities_count = db.query(Activity).count()
    if existing_activities_count == 0:
        logger.info("Populando feed de atividades inicial...")
        activities = [
            Activity(
                user_id=2,
                type="achievement_unlocked",
                payload={
                    "user_id": 2,
                    "username": "CyberKnight",
                    "game_id": 1,
                    "game_title": "The Blood of the Dawnwalker",
                    "name": "Conquistador Lendário",
                    "achievement_name": "Conquistador Lendário",
                    "rarity": "Épico",
                    "description": "Dominou as principais missões e desafios em The Blood of the Dawnwalker.",
                    "icon_url": "https://picsum.photos/seed/ach1/120/120",
                },
                created_at=now - timedelta(minutes=15),
            ),
            Activity(
                user_id=3,
                type="game_purchased",
                payload={
                    "user_id": 3,
                    "username": "Valkyrie",
                    "game_id": 10,
                    "game_title": "Hollow Knight: Silksong",
                    "price": 46.99,
                    "banner_url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop",
                },
                created_at=now - timedelta(hours=1),
            ),
            Activity(
                user_id=1,
                type="achievement_unlocked",
                payload={
                    "user_id": 1,
                    "username": "GGTorres2001",
                    "game_id": 1,
                    "game_title": "The Blood of the Dawnwalker",
                    "name": "Início de The Blood of the Dawnwalker",
                    "achievement_name": "Início de The Blood of the Dawnwalker",
                    "rarity": "Comum",
                    "description": "Iniciou The Blood of the Dawnwalker pela primeira vez e registrou telemetria.",
                    "icon_url": "https://picsum.photos/seed/ach2/120/120",
                },
                created_at=now - timedelta(hours=3),
            ),
            Activity(
                user_id=4,
                type="level_up",
                payload={
                    "user_id": 4,
                    "username": "PixelMage",
                    "old_level": 4,
                    "new_level": 5,
                    "xp": 2500,
                },
                created_at=now - timedelta(hours=6),
            ),
        ]
        db.add_all(activities)
        db.commit()
