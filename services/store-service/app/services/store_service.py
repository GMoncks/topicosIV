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

    @staticmethod
    def build_game_package(
        db: Session,
        game_id: int,
        user_id: int,
        user_token: Optional[str] = None
    ) -> tuple:
        """
        Constrói dinamicamente em memória um arquivo .zip contendo:
        1. game.py (cópia do script correspondente do jogo)
        2. mist_sdk.py (módulo client SDK da plataforma)
        3. session.json (credenciais da sessão do usuário autenticado)
        Retorna (io.BytesIO, filename).
        """
        import io
        import os
        import re
        import zipfile
        from fastapi import HTTPException, status

        game = StoreService.get_game_by_id(db=db, game_id=game_id)
        if not game:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Jogo não encontrado."
            )

        if not game.game_file:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este jogo não possui pacote de download direto disponível no momento."
            )

        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        game_src_path = os.path.join(base_dir, "data", game.game_file)
        sdk_src_path = os.path.join(base_dir, "data", "mist_sdk.py")

        if not os.path.isfile(game_src_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Arquivo fonte do jogo '{game.game_file}' não foi encontrado no servidor."
            )

        if not os.path.isfile(sdk_src_path):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Módulo mist_sdk.py não encontrado no servidor de distribuição."
            )

        with open(game_src_path, "r", encoding="utf-8") as f:
            game_code = f.read()

        with open(sdk_src_path, "r", encoding="utf-8") as f:
            sdk_code = f.read()

        session_data = {
            "session_token": user_token or "offline_dev_token",
            "user_id": user_id,
            "game_id": game.id,
            "game_title": game.title,
            "library_api_url": os.getenv("LIBRARY_API_URL", "http://localhost:8003"),
        }

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("game.py", game_code)
            zf.writestr("mist_sdk.py", sdk_code)
            zf.writestr("session.json", json.dumps(session_data, indent=2, ensure_ascii=False))

        zip_buffer.seek(0)
        slug = re.sub(r"[^a-zA-Z0-9_\-]", "_", game.title.lower()).strip("_")
        filename = f"{slug}.zip"
        return zip_buffer, filename

    @staticmethod
    def add_to_wishlist(db: Session, user_id: int, game_id: int):
        from app.models.wishlist import Wishlist
        existing = db.query(Wishlist).filter(Wishlist.user_id == user_id, Wishlist.game_id == game_id).first()
        if existing:
            return existing, False
        
        new_wishlist = Wishlist(user_id=user_id, game_id=game_id)
        db.add(new_wishlist)
        db.commit()
        db.refresh(new_wishlist)
        return new_wishlist, True

    @staticmethod
    def remove_from_wishlist(db: Session, user_id: int, game_id: int) -> bool:
        from app.models.wishlist import Wishlist
        item = db.query(Wishlist).filter(Wishlist.user_id == user_id, Wishlist.game_id == game_id).first()
        if not item:
            return False
        
        db.delete(item)
        db.commit()
        return True

    @staticmethod
    def get_user_wishlist(db: Session, user_id: int):
        from app.models.wishlist import Wishlist
        return db.query(Wishlist).filter(Wishlist.user_id == user_id).order_by(desc(Wishlist.added_at)).all()
