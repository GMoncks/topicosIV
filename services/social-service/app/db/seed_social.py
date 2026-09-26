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

    # 3. Seed de Atividades do Feed se não existirem
    existing_activities_count = db.query(Activity).count()
    if existing_activities_count == 0:
        logger.info("Populando feed de atividades inicial...")
        activities = [
            Activity(
                user_id=2,
                type="achievement_unlocked",
                payload={
                    "username": "CyberKnight",
                    "game_title": "Helldivers 2",
                    "achievement_name": "Espalhando Democracia",
                    "description": "Elimine 500 inimigos com armas pesadas",
                    "icon_url": "https://picsum.photos/seed/ach1/120/120",
                },
                created_at=now - timedelta(minutes=15),
            ),
            Activity(
                user_id=3,
                type="game_purchased",
                payload={
                    "username": "Valkyrie",
                    "game_title": "Hollow Knight",
                    "price": 46.99,
                    "banner_url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop",
                },
                created_at=now - timedelta(hours=1),
            ),
            Activity(
                user_id=1,
                type="achievement_unlocked",
                payload={
                    "username": "GGTorres2001",
                    "game_title": "Space Marine 2",
                    "achievement_name": "Primeira Baixa",
                    "description": "Conclua o prólogo em qualquer dificuldade",
                    "icon_url": "https://picsum.photos/seed/ach2/120/120",
                },
                created_at=now - timedelta(hours=3),
            ),
            Activity(
                user_id=4,
                type="level_up",
                payload={
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
