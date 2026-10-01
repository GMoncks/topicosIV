import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.transaction import WalletTransaction
from app.models.listing import MarketListing

logger = logging.getLogger(__name__)

USER_TRANSACTIONS = [
    # mkritli (id 1)
    (1, "recarga", 500.00, "Recarga via PIX aprovada", 25),
    (1, "compra", 199.90, "Compra: Elden Ring: Shadow of the Erdtree", 24),
    (1, "compra", 199.99, "Compra: Baldur's Gate 3", 20),
    (1, "recarga", 300.00, "Recarga de saldo na Carteira MIST", 16),
    (1, "compra", 159.00, "Compra: Cyberpunk 2077: Phantom Liberty", 15),
    (1, "venda", 85.00, "Venda no Mercado da Comunidade: Adesivo Holográfico MIST", 12),
    (1, "venda", 120.00, "Venda no Mercado: Card Raro #04", 11),
    (1, "compra", 275.00, "Compra: The Blood of the Dawnwalker", 10),
    (1, "recarga", 200.00, "Recarga de saldo na Carteira MIST", 5),
    (1, "compra", 89.99, "Compra: Hollow Knight: Silksong", 2),
    (1, "venda", 45.00, "Venda no Mercado: Skin MIST Labirinto", 1),
    # gabriel_t800 (id 2)
    (2, "recarga", 1000.00, "Recarga Bancária Carteira MIST", 30),
    (2, "compra", 300.00, "Compra: The Witcher 3: Wild Hunt — Remastered", 28),
    (2, "compra", 199.00, "Compra: Wardogs", 22),
    (2, "venda", 250.00, "Venda no Mercado: Faca Tática MIST", 20),
    (2, "venda", 320.00, "Venda no Mercado: Item Cosmético Lendário", 18),
    (2, "compra", 90.00, "Compra: Orbitals", 15),
    (2, "compra", 150.00, "Compra: Fire Emblem: Fortune's Weave", 14),
    (2, "recarga", 500.00, "Recarga de saldo na Carteira MIST", 10),
    (2, "venda", 180.00, "Venda no Mercado: Luvas Exclusivas", 8),
    (2, "compra", 350.00, "Compra: Control Resonant", 4),
    (2, "venda", 89.00, "Venda no Mercado: Card Raro #12", 2),
    # sarah_connor (id 3)
    (3, "recarga", 600.00, "Recarga de saldo na Carteira MIST", 22),
    (3, "compra", 250.00, "Compra: Silent Hill: Townfall", 20),
    (3, "compra", 200.00, "Compra: Onimusha: Way of the Sword", 16),
    (3, "recarga", 300.00, "Recarga de saldo na Carteira MIST", 12),
    (3, "compra", 159.00, "Compra: Cyberpunk 2077: Phantom Liberty", 10),
    (3, "compra", 275.00, "Compra: The Blood of the Dawnwalker", 3),
    (3, "venda", 64.00, "Venda no Mercado: Insígnia Especial Cyber", 2),
    # lucas_speed (id 4)
    (4, "recarga", 300.00, "Recarga PIX", 26),
    (4, "compra", 89.99, "Compra: Hollow Knight: Silksong", 25),
    (4, "compra", 90.00, "Compra: Orbitals", 20),
    (4, "recarga", 200.00, "Recarga de saldo na Carteira MIST", 10),
    (4, "compra", 199.99, "Compra: Baldur's Gate 3", 2),
    (4, "venda", 15.00, "Venda no Mercado: Emoticon Speed", 1),
    # elena_rpg (id 5)
    (5, "recarga", 800.00, "Recarga Bancária Carteira MIST", 28),
    (5, "compra", 199.99, "Compra: Baldur's Gate 3", 26),
    (5, "compra", 150.00, "Compra: Fire Emblem: Fortune's Weave", 22),
    (5, "recarga", 500.00, "Recarga de saldo na Carteira MIST", 18),
    (5, "compra", 300.00, "Compra: The Witcher 3: Wild Hunt — Remastered", 15),
    (5, "compra", 90.00, "Compra: Orbitals", 14),
    (5, "compra", 200.00, "Compra: Onimusha: Way of the Sword", 5),
    (5, "venda", 120.00, "Venda no Mercado: Background Perfil Fantasia", 4),
    (5, "venda", 160.00, "Venda no Mercado: Insígnia Mago Ancião", 2),
    # novato_mist (id 6)
    (6, "recarga", 200.00, "Bônus de Boas-vindas MIST", 3),
    (6, "compra", 90.00, "Compra: Orbitals", 2),
    (6, "recarga", 90.00, "Recarga de saldo na Carteira MIST", 1),
]

SAMPLE_LISTINGS = [
    {"seller_id": 1, "item_id": 101, "item_type": "card", "item_name": "Elden Ring: Erdtree Foil Trading Card", "game_id": 11, "price": 12.50},
    {"seller_id": 2, "item_id": 102, "item_type": "avatar_frame", "item_name": "Elden Ring: Malenia Blade of Miquella Frame", "game_id": 11, "price": 25.00},
    {"seller_id": 2, "item_id": 103, "item_type": "emoticon", "item_name": "CS2 / Counter-Strike: AK-47 Neon Rider Sticker", "game_id": 9, "price": 45.00},
    {"seller_id": 3, "item_id": 104, "item_type": "badge", "item_name": "CS2 / Counter-Strike: Tactical Karambit Pin", "game_id": 9, "price": 180.00},
    {"seller_id": 4, "item_id": 105, "item_type": "background", "item_name": "Steam Deck OLED Nebula Animated Background", "game_id": None, "price": 15.00},
    {"seller_id": 1, "item_id": 106, "item_type": "badge", "item_name": "Cyberpunk 2077: Samurai Rockerboy Insignia", "game_id": 12, "price": 32.00},
    {"seller_id": 5, "item_id": 107, "item_type": "emoticon", "item_name": "Baldur's Gate 3: Mind Flayer Rare Emoticon", "game_id": 13, "price": 8.50},
    {"seller_id": 2, "item_id": 108, "item_type": "background", "item_name": "The Witcher 3: Wolf Medallion Animated Profile", "game_id": 8, "price": 18.00},
    {"seller_id": 4, "item_id": 109, "item_type": "avatar_frame", "item_name": "Hollow Knight: Hornet Needle Avatar Frame", "game_id": 10, "price": 30.00},
    {"seller_id": 4, "item_id": 110, "item_type": "badge", "item_name": "Speedrunner Golden Stopwatch Commemorative Badge", "game_id": None, "price": 65.00},
    {"seller_id": 3, "item_id": 111, "item_type": "card", "item_name": "Silent Hill: Townfall Misty Card #03", "game_id": 6, "price": 9.90},
    {"seller_id": 5, "item_id": 112, "item_type": "card", "item_name": "Fire Emblem: Fortune's Weave Legendary Crest Card", "game_id": 5, "price": 14.00},
]


def seed_market_data(db: Session) -> int:
    """Popula histórico da carteira e anúncios do mercado se não existirem."""
    now = datetime.now(timezone.utc)
    added_tx = 0

    if db.query(WalletTransaction).count() == 0:
        for idx, (u_id, t_type, amount, desc, days_ago) in enumerate(USER_TRANSACTIONS):
            t_dt = now - timedelta(days=days_ago, minutes=idx * 15)
            tx = WalletTransaction(
                user_id=u_id,
                type=t_type,
                amount=amount,
                description=desc,
                created_at=t_dt,
            )
            db.add(tx)
            added_tx += 1

    added_listings = 0
    if db.query(MarketListing).count() == 0:
        for idx, l in enumerate(SAMPLE_LISTINGS):
            listing = MarketListing(
                seller_id=l["seller_id"],
                item_id=l["item_id"],
                item_type=l["item_type"],
                item_name=l["item_name"],
                game_id=l["game_id"],
                price=l["price"],
                status="ativo",
                created_at=now - timedelta(days=2, hours=idx),
            )
            db.add(listing)
            added_listings += 1

    if added_tx > 0 or added_listings > 0:
        db.commit()
        logger.info(f"Seed de mercado concluída: {added_tx} transações e {added_listings} anúncios inseridos.")
    return added_tx + added_listings
