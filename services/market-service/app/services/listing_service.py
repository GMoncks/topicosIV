from datetime import datetime, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.listing import MarketListing
from app.schemas.listing import MarketListingCreate
from app.services.inventory_client import InventoryClient


def _utcnow():
    return datetime.now(timezone.utc)


class ListingService:
    """
    Anúncios do Mercado da Comunidade (L-02 a L-04, L-11).

    A validação de posse e o bloqueio/desbloqueio do item cosmético vivem no
    auth-service (Bloco J, inventário — Dev 2), via `InventoryClient`. Como
    esse contrato ainda não existe, falhamos fechado: qualquer
    indisponibilidade do auth-service impede a criação/cancelamento do
    anúncio, em vez de deixar o item "solto".
    """

    @staticmethod
    async def create_listing(
        db: Session, seller_id: int, payload: MarketListingCreate, http_client=None
    ) -> MarketListing:
        await InventoryClient.lock_item(seller_id, payload.item_id, http_client)

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
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[MarketListing], int]:
        """Catálogo público (L-04): apenas anúncios ativos, ordenados por menor preço."""
        query = db.query(MarketListing).filter(MarketListing.status == "ativo")
        if item_type:
            query = query.filter(MarketListing.item_type == item_type)
        if game_id:
            query = query.filter(MarketListing.game_id == game_id)
        if search and search.strip():
            query = query.filter(MarketListing.item_name.ilike(f"%{search.strip()}%"))

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

        await InventoryClient.unlock_item(seller_id, listing.item_id, http_client)

        listing.status = "cancelado"
        listing.cancelled_at = _utcnow()
        db.commit()
        db.refresh(listing)
        return listing
