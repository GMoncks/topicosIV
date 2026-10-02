"""
MIST AI Trends — Módulo de Tendências e Mais Vendidos (Ticket S-01).
Calcula os rankings de 'Top Vendidos' e 'Em Alta' (Trending)
a partir do histórico de checkouts e interações do catálogo.
"""

from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models.purchase import Purchase
from app.models.game import Game


def calculate_top_sellers(
    db: Session,
    limit: int = 10,
    days: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Calcula os jogos mais vendidos no catálogo MIST com base em compras concluídas.
    Se o número de compras for menor que o limite, complementa com os jogos de maior avaliação.
    """
    query = (
        db.query(Purchase.game_id, func.count(Purchase.id).label("sales_count"))
        .filter(Purchase.status == "completed")
    )

    if days:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        query = query.filter(Purchase.purchased_at >= cutoff)

    sales_results = (
        query.group_by(Purchase.game_id)
        .order_by(desc("sales_count"))
        .limit(limit)
        .all()
    )

    top_game_ids = [res[0] for res in sales_results]
    sales_map = {res[0]: res[1] for res in sales_results}

    games = []
    if top_game_ids:
        found_games = db.query(Game).filter(Game.id.in_(top_game_ids)).all()
        # Preserva a ordem decrescente de vendas
        games_by_id = {g.id: g for g in found_games}
        for gid in top_game_ids:
            if gid in games_by_id:
                g_dict = games_by_id[gid].to_dict()
                g_dict["sales_count"] = sales_map.get(gid, 0)
                games.append(g_dict)

    # Fallback/complemento: se não tiver jogos suficientes, adiciona jogos bem avaliados
    if len(games) < limit:
        excluded_ids = [g["id"] for g in games]
        extra_games = (
            db.query(Game)
            .filter(~Game.id.in_(excluded_ids))
            .order_by(desc(Game.review_score))
            .limit(limit - len(games))
            .all()
        )
        for eg in extra_games:
            eg_dict = eg.to_dict()
            eg_dict["sales_count"] = 0
            games.append(eg_dict)

    return games[:limit]


def calculate_trending_games(
    db: Session,
    limit: int = 10,
    days: int = 7
) -> List[Dict[str, Any]]:
    """
    Calcula os jogos 'Em Alta' (Trending) combinando:
    - Volume de vendas recentes (janela de X dias)
    - Review score da comunidade
    - Desconto promocional ativo
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    recent_sales = (
        db.query(Purchase.game_id, func.count(Purchase.id).label("recent_count"))
        .filter(Purchase.status == "completed", Purchase.purchased_at >= cutoff)
        .group_by(Purchase.game_id)
        .all()
    )
    sales_map = {res[0]: res[1] for res in recent_sales}

    all_games = db.query(Game).all()
    scored_games = []

    for game in all_games:
        recent_count = sales_map.get(game.id, 0)
        review_score = float(game.review_score or 7.0)
        discount = float(game.discount_percentage or 0)

        # Fórmula ponderada do MIST Trending Algorithm
        trending_score = round(
            (recent_count * 25.0) + (review_score * 5.0) + (discount * 0.4),
            1
        )

        g_dict = game.to_dict()
        g_dict["trending_score"] = trending_score
        g_dict["recent_sales_count"] = recent_count

        if recent_count > 0:
            g_dict["trending_reason"] = f"Em alta com {recent_count} vendas nesta semana e avaliação {review_score}/10!"
        elif discount > 0:
            g_dict["trending_reason"] = f"Destaque em promoção com {int(discount)}% OFF e avaliação {review_score}/10."
        else:
            g_dict["trending_reason"] = f"Favorito da comunidade MIST na categoria {game.category}."

        scored_games.append(g_dict)

    scored_games.sort(key=lambda x: x["trending_score"], reverse=True)
    return scored_games[:limit]
