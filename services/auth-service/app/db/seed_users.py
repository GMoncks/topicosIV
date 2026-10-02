import logging
import bcrypt
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.inventory import InventoryItem

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

SEED_INVENTORY_ITEMS = [
    {
        "user_id": 1,
        "item_id": "card_witcher_geralt",
        "name": "Geralt de Rívia (Carta)",
        "item_type": "card",
        "asset_url": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=400&q=80",
        "price_points": 0,
        "is_equipped": False,
        "status": "disponivel",
        "game_id": 1,
        "rarity": "Raro",
        "description": "Carta colecionável número 1 da série The Witcher 3: Wild Hunt."
    },
    {
        "user_id": 1,
        "item_id": "card_cyber_v",
        "name": "V de Night City (Carta)",
        "item_type": "card",
        "asset_url": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80",
        "price_points": 0,
        "is_equipped": False,
        "status": "listado",
        "game_id": 2,
        "rarity": "Épico",
        "description": "Mercenário cibernético anunciado no Mercado da Comunidade."
    },
    {
        "user_id": 1,
        "item_id": "emoticon_pixel_sword",
        "name": ":pixel_sword: (Emoticon)",
        "item_type": "emoticon",
        "asset_url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80",
        "price_points": 250,
        "is_equipped": False,
        "status": "disponivel",
        "rarity": "Comum",
        "description": "Emoticon de espada clássica de 8-bits."
    },
    {
        "user_id": 1,
        "item_id": "bg_cyberpunk_alley",
        "name": "Beco Neon 2077 (Plano de Fundo)",
        "item_type": "background",
        "asset_url": "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=80",
        "price_points": 1200,
        "is_equipped": True,
        "status": "equipado",
        "rarity": "Raro",
        "description": "Plano de fundo animado das ruas chuvosas de Neo-Tokyo."
    },
    {
        "user_id": 1,
        "item_id": "frame_gold_cyber",
        "name": "Moldura Dourada Cyberpunk",
        "item_type": "avatar_frame",
        "asset_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80",
        "price_points": 1500,
        "is_equipped": True,
        "status": "equipado",
        "rarity": "Lendário",
        "description": "Moldura dourada pulsante para avatar de perfil."
    },
    {
        "user_id": 1,
        "item_id": "badge_pioneiro_1",
        "name": "Pioneiro da MIST Nível 1",
        "item_type": "badge",
        "asset_url": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=300&q=80",
        "price_points": 0,
        "is_equipped": False,
        "status": "disponivel",
        "rarity": "Especial",
        "description": "Insígnia concedida aos primeiros membros da plataforma."
    },
    {
        "user_id": 2,
        "item_id": "card_hollow_knight",
        "name": "Cavaleiro do Vazio (Carta)",
        "item_type": "card",
        "asset_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80",
        "price_points": 0,
        "is_equipped": False,
        "status": "disponivel",
        "game_id": 3,
        "rarity": "Raro",
        "description": "Carta colecionável de Hallownest."
    },
    {
        "user_id": 2,
        "item_id": "frame_neon",
        "name": "Moldura Neon Dourada",
        "item_type": "avatar_frame",
        "asset_url": "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=300&q=80",
        "price_points": 1000,
        "is_equipped": True,
        "status": "equipado",
        "rarity": "Épico",
        "description": "Moldura geométrica dourada com efeito neon."
    },
    {
        "user_id": 2,
        "item_id": "emoticon_fire",
        "name": ":mist_fire: (Emoticon)",
        "item_type": "emoticon",
        "asset_url": "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=400&q=80",
        "price_points": 300,
        "is_equipped": False,
        "status": "disponivel",
        "rarity": "Comum",
        "description": "Emoticon de fogo para bate-papo."
    },
    {
        "user_id": 2,
        "item_id": "badge_master_collector",
        "name": "Mestre Colecionador",
        "item_type": "badge",
        "asset_url": "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=300&q=80",
        "price_points": 0,
        "is_equipped": False,
        "status": "disponivel",
        "rarity": "Lendário",
        "description": "Insígnia de colecionador avançado da MIST."
    }
]


def seed_users(db: Session) -> int:
    """Popula os usuários padrão do MIST e seus itens iniciais de inventário."""
    users_added = 0
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
            users_added += 1

    # Popula inventário se estiver vazio
    inv_count = db.query(InventoryItem).count()
    if inv_count == 0:
        for it in SEED_INVENTORY_ITEMS:
            db_item = InventoryItem(
                user_id=it["user_id"],
                item_id=it["item_id"],
                name=it["name"],
                item_type=it["item_type"],
                asset_url=it["asset_url"],
                price_points=it.get("price_points", 0),
                is_equipped=it.get("is_equipped", False),
                status=it.get("status", "disponivel"),
                game_id=it.get("game_id"),
                rarity=it.get("rarity", "Comum"),
                description=it.get("description"),
                acquired_at=now
            )
            db.add(db_item)

    if users_added > 0 or inv_count == 0:
        db.commit()
        logger.info(f"Seed concluída: {users_added} usuários inseridos.")
    return users_added
