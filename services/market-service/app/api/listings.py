from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.listing import ITEM_TYPES, MarketListing
from app.schemas.listing import (
    MarketBuyResponse,
    MarketListingCreate,
    MarketListingPage,
    MarketListingResponse,
)
from app.services.checkout import MarketCheckoutService
from app.services.listing_service import ListingService

router = APIRouter(tags=["Market Listings"])


def _require_user_id(x_user_id: Optional[str]) -> int:
    if not x_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado")
    try:
        user_id = int(x_user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Identificador de usuário inválido.")
    if user_id <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Identificador de usuário inválido.")
    return user_id


@router.post("/market/list", response_model=MarketListingResponse, status_code=status.HTTP_201_CREATED)
async def create_listing(
    payload: MarketListingCreate,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """
    Anuncia um item do inventário para venda (L-03). Valida posse e bloqueia o
    item no auth-service antes de criar o anúncio (falha fechada).
    """
    seller_id = _require_user_id(x_user_id)
    listing = await ListingService.create_listing(db=db, seller_id=seller_id, payload=payload)
    return listing


@router.get("/market/listings", response_model=MarketListingPage, status_code=status.HTTP_200_OK)
def list_listings(
    item_type: Optional[str] = Query(None, description=f"Filtrar por tipo: {sorted(ITEM_TYPES)}"),
    game_id: Optional[int] = Query(None, gt=0, description="Filtrar por jogo"),
    search: Optional[str] = Query(None, description="Filtrar por nome do item"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Catálogo público de anúncios ativos, ordenado por menor preço (L-04)."""
    if item_type is not None and item_type not in ITEM_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo inválido. Use um de: {sorted(ITEM_TYPES)}",
        )
    items, total = ListingService.list_active_listings(
        db=db, item_type=item_type, game_id=game_id, search=search, skip=skip, limit=limit
    )
    return MarketListingPage(items=items, total=total, skip=skip, limit=limit)


@router.get("/market/my-listings", response_model=MarketListingPage, status_code=status.HTTP_200_OK)
def get_my_listings(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    status_filter: Optional[str] = Query(None, alias="status", description="ativo, vendido ou cancelado"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Aba "Meus Anúncios" (L-11): todos os anúncios do usuário autenticado."""
    seller_id = _require_user_id(x_user_id)
    items, total = ListingService.get_my_listings(
        db=db, seller_id=seller_id, listing_status=status_filter, skip=skip, limit=limit
    )
    return MarketListingPage(items=items, total=total, skip=skip, limit=limit)


@router.post("/market/listings/{listing_id}/cancel", response_model=MarketListingResponse)
async def cancel_listing(
    listing_id: int,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Cancela um anúncio ativo próprio e libera o item no inventário (L-11)."""
    seller_id = _require_user_id(x_user_id)
    listing = await ListingService.cancel_listing(db=db, seller_id=seller_id, listing_id=listing_id)
    return listing


@router.post("/market/buy/{listing_id}", response_model=MarketBuyResponse, status_code=status.HTTP_201_CREATED)
async def buy_listing(
    listing_id: int,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Compra um anúncio ativo, com transferência atômica de saldo e custódia (L-05)."""
    buyer_id = _require_user_id(x_user_id)
    result = await MarketCheckoutService.buy_listing(db=db, buyer_id=buyer_id, listing_id=listing_id)
    return result
