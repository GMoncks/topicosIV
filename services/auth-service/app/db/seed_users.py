import logging
import bcrypt
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.user import User

logger = logging.getLogger(__name__)

SEED_USERS = [
    {
        "id": 1,
        "username": "mkritli",
        "email": "mauricio@live.com",
        "password": "Password@123",
        "wallet_balance": 450.00,
        "points_balance": 3500,
        "level": 12,
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=mkritli",
    },
    {
        "id": 2,
        "username": "gabriel_t800",
        "email": "gabriel@mistgames.com",
        "password": "Password@123",
        "wallet_balance": 1250.00,
        "points_balance": 8200,
        "level": 24,
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=gabriel_t800",
    },
    {
        "id": 3,
        "username": "sarah_connor",
        "email": "sarah.connor@sky.net",
        "password": "Password@123",
        "wallet_balance": 380.00,
        "points_balance": 2100,
        "level": 8,
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=sarah_connor",
    },
    {
        "id": 4,
        "username": "lucas_speed",
        "email": "lucas.speed@speedrun.io",
        "password": "Password@123",
        "wallet_balance": 85.00,
        "points_balance": 1450,
        "level": 6,
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=lucas_speed",
    },
    {
        "id": 5,
        "username": "elena_rpg",
        "email": "elena.rostova@questguild.org",
        "password": "Password@123",
        "wallet_balance": 740.00,
        "points_balance": 4800,
        "level": 15,
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=elena_rpg",
    },
    {
        "id": 6,
        "username": "novato_mist",
        "email": "novato@mist.com",
        "password": "Password@123",
        "wallet_balance": 200.00,
        "points_balance": 500,
        "level": 1,
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=novato_mist",
    },
]


def seed_users(db: Session) -> int:
    """Popula os usuários padrão do MIST caso ainda não existam no banco."""
    added = 0
    now = datetime.now(timezone.utc)
    for u in SEED_USERS:
        existing = db.query(User).filter((User.id == u["id"]) | (User.username == u["username"]) | (User.email == u["email"])).first()
        if not existing:
            salt = bcrypt.gensalt()
            h_pwd = bcrypt.hashpw(u["password"].encode("utf-8"), salt).decode("utf-8")
            new_u = User(
                id=u["id"],
                username=u["username"],
                email=u["email"],
                hashed_password=h_pwd,
                wallet_balance=u["wallet_balance"],
                points_balance=u["points_balance"],
                level=u["level"],
                avatar_url=u["avatar_url"],
                created_at=now,
            )
            db.add(new_u)
            added += 1
    if added > 0:
        db.commit()
        logger.info(f"Seed de usuários concluída: {added} usuários inseridos.")
    return added
