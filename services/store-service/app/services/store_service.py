import json
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.models.game import Game


class StoreService:
    @staticmethod
    def list_games(
        db: Session,
        category: Optional[str] = None,
        tag: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        search: Optional[str] = None,
        sort_by: Optional[str] = "release_date",
        order: Optional[str] = "desc",
        skip: int = 0,
        limit: int = 50,
    ) -> List[Game]:
        query = db.query(Game)

        # Filtro por Categoria
        if category:
            query = query.filter(Game.category.ilike(category.strip()))

        # Filtro por Tag (dentro do array JSON, suportando tanto formato UTF-8 direto quanto unicode escapado)
        if tag:
            cleaned_tag = tag.strip()
            escaped_tag = json.dumps(cleaned_tag)[1:-1]
            if escaped_tag != cleaned_tag:
                query = query.filter(
                    or_(
                        Game.tags.like(f'%"{cleaned_tag}"%'),
                        Game.tags.like(f'%"{escaped_tag}"%')
                    )
                )
            else:
                query = query.filter(Game.tags.like(f'%"{cleaned_tag}"%'))

        # Filtro por Preço Mínimo e Máximo
        if min_price is not None:
            query = query.filter(Game.price >= min_price)
        if max_price is not None:
            query = query.filter(Game.price <= max_price)

        # Busca Textual (Título, Descrição e Publisher)
        if search:
            search_term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Game.title.ilike(search_term),
                    Game.description.ilike(search_term),
                    Game.publisher.ilike(search_term)
                )
            )

        # Ordenação
        sort_columns = {
            "price": Game.price,
            "release_date": Game.release_date,
            "review_score": Game.review_score,
            "title": Game.title,
            "id": Game.id,
        }
        column = sort_columns.get(sort_by.lower() if sort_by else "release_date", Game.release_date)

        is_desc = (order or "desc").lower() == "desc"
        query = query.order_by(desc(column) if is_desc else asc(column))

        # Paginação
        return query.offset(skip).limit(limit).all()

    @staticmethod
    def get_game_by_id(db: Session, game_id: int) -> Optional[Game]:
        return db.query(Game).filter(Game.id == game_id).first()
