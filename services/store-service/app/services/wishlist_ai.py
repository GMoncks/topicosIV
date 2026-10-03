"""
MIST Wishlist AI — Notificador Proativo de Descontos (Ticket S-03).
Monitora os itens favoritados na Lista de Desejos e gera alertas
inteligentes com cálculo de economia e chamadas personalizadas.
"""

from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.models.wishlist import Wishlist
from app.models.game import Game


def get_wishlist_discount_alerts(
    db: Session,
    user_id: int
) -> List[Dict[str, Any]]:
    """
    Identifica jogos da Wishlist do usuário que estão atualmente com desconto,
    calculando economia absoluta e percentual com mensagem contextual gerada pela IA.
    """
    wishlist_entries = db.query(Wishlist).filter(Wishlist.user_id == user_id).all()
    if not wishlist_entries:
        return []

    game_ids = [entry.game_id for entry in wishlist_entries]
    games = db.query(Game).filter(Game.id.in_(game_ids)).all()

    alerts = []
    for game in games:
        discount = int(game.discount_percentage or 0)
        orig_price = float(game.original_price if game.original_price is not None else game.price)
        curr_price = float(game.price)

        if discount > 0 or curr_price < orig_price:
            savings = round(max(0.0, orig_price - curr_price), 2)
            if discount == 0 and orig_price > 0:
                discount = int(round(((orig_price - curr_price) / orig_price) * 100))

            message = (
                f"Grande oportunidade! '{game.title}' da sua Lista de Desejos está com "
                f"{discount}% OFF por R$ {curr_price:.2f} (economia de R$ {savings:.2f})!"
            )

            alerts.append({
                "game_id": game.id,
                "title": game.title,
                "banner_url": game.banner_url,
                "category": game.category,
                "original_price": orig_price,
                "current_price": curr_price,
                "discount_percentage": discount,
                "savings": savings,
                "message": message,
            })

    # Ordena pelos maiores descontos
    alerts.sort(key=lambda a: a["discount_percentage"], reverse=True)
    return alerts
