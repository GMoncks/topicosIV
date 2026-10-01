import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.purchase import Purchase
from app.models.wishlist import Wishlist

logger = logging.getLogger(__name__)

USER_PURCHASES_DATA = [
    # mkritli (id 1)
    {"user_id": 1, "game_id": 11, "price": 199.90, "days_ago": 1},
    {"user_id": 1, "game_id": 13, "price": 199.99, "days_ago": 3},
    {"user_id": 1, "game_id": 12, "price": 159.00, "days_ago": 7},
    {"user_id": 1, "game_id": 1, "price": 275.00, "days_ago": 10},
    {"user_id": 1, "game_id": 10, "price": 89.99, "days_ago": 2},
    {"user_id": 1, "game_id": 14, "price": 0.0, "days_ago": 15},
    # gabriel_t800 (id 2)
    {"user_id": 2, "game_id": 8, "price": 300.00, "days_ago": 2},
    {"user_id": 2, "game_id": 9, "price": 199.00, "days_ago": 5},
    {"user_id": 2, "game_id": 2, "price": 90.00, "days_ago": 8},
    {"user_id": 2, "game_id": 15, "price": 0.0, "days_ago": 12},
    {"user_id": 2, "game_id": 7, "price": 350.00, "days_ago": 4},
    {"user_id": 2, "game_id": 5, "price": 150.00, "days_ago": 14},
    # sarah_connor (id 3)
    {"user_id": 3, "game_id": 12, "price": 159.00, "days_ago": 1},
    {"user_id": 3, "game_id": 3, "price": 200.00, "days_ago": 6},
    {"user_id": 3, "game_id": 6, "price": 250.00, "days_ago": 11},
    {"user_id": 3, "game_id": 1, "price": 275.00, "days_ago": 3},
    {"user_id": 3, "game_id": 16, "price": 0.0, "days_ago": 18},
    # lucas_speed (id 4)
    {"user_id": 4, "game_id": 10, "price": 89.99, "days_ago": 1},
    {"user_id": 4, "game_id": 2, "price": 90.00, "days_ago": 4},
    {"user_id": 4, "game_id": 14, "price": 0.0, "days_ago": 15},
    {"user_id": 4, "game_id": 15, "price": 0.0, "days_ago": 18},
    {"user_id": 4, "game_id": 13, "price": 199.99, "days_ago": 2},
    # elena_rpg (id 5)
    {"user_id": 5, "game_id": 13, "price": 199.99, "days_ago": 1},
    {"user_id": 5, "game_id": 5, "price": 150.00, "days_ago": 3},
    {"user_id": 5, "game_id": 8, "price": 300.00, "days_ago": 8},
    {"user_id": 5, "game_id": 3, "price": 200.00, "days_ago": 5},
    {"user_id": 5, "game_id": 2, "price": 90.00, "days_ago": 16},
    # novato_mist (id 6)
    {"user_id": 6, "game_id": 16, "price": 0.0, "days_ago": 1},
    {"user_id": 6, "game_id": 2, "price": 90.00, "days_ago": 2},
]

USER_WISHLISTS_DATA = [
    (1, [4, 6]),
    (2, [3, 11]),
    (3, [4, 7]),
    (4, [11, 12]),
    (5, [1, 6]),
    (6, [10, 14]),
]


def seed_purchases_and_wishlist(db: Session) -> int:
    """Popula histórico de compras e listas de desejos se não existirem."""
    now = datetime.now(timezone.utc)
    added_purchases = 0

    for item in USER_PURCHASES_DATA:
        u_id = item["user_id"]
        g_id = item["game_id"]
        key = f"seed_chk_{u_id}_{g_id}"
        existing = db.query(Purchase).filter((Purchase.idempotency_key == key) | ((Purchase.user_id == u_id) & (Purchase.game_id == g_id))).first()
        if not existing:
            dt = now - timedelta(days=item.get("days_ago", 5))
            p = Purchase(
                user_id=u_id,
                game_id=g_id,
                price_paid=item.get("price", 0.0),
                status="completed",
                purchased_at=dt,
                idempotency_key=key,
            )
            db.add(p)
            added_purchases += 1

    added_wishlists = 0
    for u_id, game_ids in USER_WISHLISTS_DATA:
        for g_id in game_ids:
            existing_w = db.query(Wishlist).filter(Wishlist.user_id == u_id, Wishlist.game_id == g_id).first()
            if not existing_w:
                w = Wishlist(
                    user_id=u_id,
                    game_id=g_id,
                    added_at=now - timedelta(days=15),
                )
                db.add(w)
                added_wishlists += 1

    if added_purchases > 0 or added_wishlists > 0:
        db.commit()
        logger.info(f"Seed de loja: {added_purchases} compras e {added_wishlists} itens de wishlist inseridos.")
    return added_purchases + added_wishlists
