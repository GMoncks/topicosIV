from datetime import datetime, timezone
from typing import List, Optional, Tuple
import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import AUTH_SERVICE_URL
from app.models.listing import MarketListing
from app.schemas.listing import MarketListingCreate


def _utcnow():
    return datetime.now(timezone.utc)


class ListingService:
    """
    Anúncios do Mercado da Comunidade (L-02 a L-04, L-11).

    A validação de posse e o bloqueio/desbloqueio do item cosmético vivem no
    auth-service (Bloco J, inventário — Dev 2). Como esse contrato ainda não
    existe, chamamos o formato documentado em `docs/architecture.md` §2.6 e
    falhamos fechado: qualquer indisponibilidade do auth-service impede a
    criação/cancelamento do anúncio, em vez de deixar o item "solto".
    """

    @staticmethod
    async def _call_inventory(
        action: str,
        user_id: int,
        item_id: int,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> dict:
        client = http_client or httpx.AsyncClient(timeout=10.0)
        try:
            resp = await client.post(
                f"{AUTH_SERVICE_URL.rstrip('/')}/inventory/items/{item_id}/{action}",
                json={"user_id": user_id},
            )
        except httpx.HTTPError:
            resp = None
        finally:
            if http_client is None:
                await client.aclose()

        if resp is None:
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "Não foi possível validar o item no inventário. Tente novamente em instantes.",
            )
        if resp.status_code == 404:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Item não encontrado no inventário.")
        if resp.status_code == 403:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Você não é o dono deste item.")
        if resp.status_code == 409:
            raise HTTPException(status.HTTP_409_CONFLICT, "Este item já está em uso ou anunciado.")
        if resp.status_code != 200:
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE, f"Falha ao {action} o item no inventário."
            )
        return resp.json()

    @staticmethod
    async def lock_item(seller_id: int, item_id: int, http_client=None) -> dict:
        return await ListingService._call_inventory("lock", seller_id, item_id, http_client)

    @staticmethod
    async def unlock_item(seller_id: int, item_id: int, http_client=None) -> dict:
        return await ListingService._call_inventory("unlock", seller_id, item_id, http_client)

    @staticmethod
    async def create_listing(
        db: Session, seller_id: int, payload: MarketListingCreate, http_client=None
    ) -> MarketListing:
        await ListingService.lock_item(seller_id, payload.item_id, http_client)

        listing = MarketListing(
            seller_id=seller_id,
            item_id=payload.item_id,
            item_type=payload.item_type,
            item_name=payload.item_name,
            game_id=payload.game_id,
            price=payload.price,
            status="ativo",
        )
        db.add(listing)
        db.commit()
        db.refresh(listing)
        return listing

    @staticmethod
    def list_active_listings(
        db: Session,
        item_type: Optional[str] = None,
        game_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[MarketListing], int]:
        """Catálogo público (L-04): apenas anúncios ativos, ordenados por menor preço."""
        query = db.query(MarketListing).filter(MarketListing.status == "ativo")
        if item_type:
            query = query.filter(MarketListing.item_type == item_type)
        if game_id:
            query = query.filter(MarketListing.game_id == game_id)

        total = query.count()
        items = query.order_by(MarketListing.price.asc(), MarketListing.id.asc()).offset(skip).limit(limit).all()
        return items, total

    @staticmethod
    def get_my_listings(
        db: Session,
        seller_id: int,
        listing_status: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[MarketListing], int]:
        """Aba "Meus Anúncios" (L-11): todos os status, mais recentes primeiro."""
        query = db.query(MarketListing).filter(MarketListing.seller_id == seller_id)
        if listing_status:
            query = query.filter(MarketListing.status == listing_status)

        total = query.count()
        items = (
            query.order_by(MarketListing.created_at.desc(), MarketListing.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return items, total

    @staticmethod
    async def cancel_listing(
        db: Session, seller_id: int, listing_id: int, http_client=None
    ) -> MarketListing:
        listing = db.query(MarketListing).filter(MarketListing.id == listing_id).first()
        if not listing:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Anúncio não encontrado.")
        if listing.seller_id != seller_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Você não pode cancelar o anúncio de outro usuário.")
        if listing.status != "ativo":
            raise HTTPException(status.HTTP_409_CONFLICT, "Apenas anúncios ativos podem ser cancelados.")

        await ListingService.unlock_item(seller_id, listing.item_id, http_client)

        listing.status = "cancelado"
        listing.cancelled_at = _utcnow()
        db.commit()
        db.refresh(listing)
        return listing
