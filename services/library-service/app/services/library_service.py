from datetime import datetime, timezone
from typing import List, Tuple, Dict, Any, Optional
import httpx
from sqlalchemy.orm import Session
from app.models.library_item import LibraryItem


class LibraryService:
    @staticmethod
    def grant_game(db: Session, user_id: int, game_id: int) -> Tuple[LibraryItem, bool]:
        """
        Concede a licença de um jogo a um usuário (idempotente).
        Retorna uma tupla: (item, created).
        """
        existing = db.query(LibraryItem).filter_by(user_id=user_id, game_id=game_id).first()
        if existing:
            return existing, False

        new_item = LibraryItem(
            user_id=user_id,
            game_id=game_id,
            acquired_at=datetime.now(timezone.utc),
            playtime_minutes=0,
            is_installed=False,
            last_played=None
        )
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        return new_item, True

    @staticmethod
    def get_user_games(db: Session, user_id: int) -> List[LibraryItem]:
        """
        Retorna todos os registros da biblioteca pertencentes ao usuário informado.
        """
        return db.query(LibraryItem).filter_by(user_id=user_id).order_by(LibraryItem.acquired_at.desc()).all()

    @staticmethod
    async def enrich_library_items(
        items: List[LibraryItem],
        store_service_url: str,
        client: Optional[httpx.AsyncClient] = None
    ) -> List[Dict[str, Any]]:
        """
        Enriquece cada item da biblioteca com os metadados do jogo (título, banner, categoria, publisher)
        buscados no store-service.
        Usa cache de requisição e fallback resiliente caso o serviço de loja esteja inacessível.
        """
        if not items:
            return []

        unique_game_ids = list({item.game_id for item in items})
        game_cache: Dict[int, Optional[Dict[str, Any]]] = {}

        owns_client = False
        if client is None:
            client = httpx.AsyncClient(timeout=5.0)
            owns_client = True

        try:
            for gid in unique_game_ids:
                try:
                    resp = await client.get(f"{store_service_url.rstrip('/')}/games/{gid}")
                    if resp.status_code == 200:
                        data = resp.json()
                        game_cache[gid] = {
                            "title": data.get("title", f"Jogo #{gid}"),
                            "category": data.get("category"),
                            "banner_url": data.get("banner_url"),
                            "publisher": data.get("publisher"),
                        }
                    else:
                        game_cache[gid] = None
                except Exception:
                    # Falha de conexão ou timeout: degradação graciosa
                    game_cache[gid] = None
        finally:
            if owns_client:
                await client.aclose()

        enriched_list = []
        for item in items:
            item_dict = item.to_dict()
            item_dict["game"] = game_cache.get(item.game_id)
            enriched_list.append(item_dict)

        return enriched_list
