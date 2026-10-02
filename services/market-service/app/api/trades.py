from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.trade import TRADE_STATUSES
from app.schemas.trade import TradeOfferCreate, TradeOfferPage, TradeOfferResponse
from app.services.trade_service import TradeService

router = APIRouter(tags=["Trade Offers"])


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


def _validate_status_filter(status_filter: Optional[str]) -> None:
    if status_filter is not None and status_filter not in TRADE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Status inválido. Use um de: {sorted(TRADE_STATUSES)}",
        )


@router.post("/trades/offer", response_model=TradeOfferResponse, status_code=status.HTTP_201_CREATED)
async def create_trade_offer(
    payload: TradeOfferCreate,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Propõe uma troca direta (L-06/L-07). Bloqueia os itens ofertados no auth-service."""
    sender_id = _require_user_id(x_user_id)
    offer = await TradeService.create_offer(db=db, sender_id=sender_id, payload=payload)
    return offer


@router.post("/trades/{offer_id}/accept", response_model=TradeOfferResponse)
async def accept_trade_offer(
    offer_id: int,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Aceita uma oferta pendente recebida. Valida os itens solicitados e troca a custódia dos dois lados."""
    receiver_id = _require_user_id(x_user_id)
    offer = await TradeService.accept_offer(db=db, receiver_id=receiver_id, offer_id=offer_id)
    return offer


@router.post("/trades/{offer_id}/decline", response_model=TradeOfferResponse)
async def decline_trade_offer(
    offer_id: int,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Recusa uma oferta pendente recebida, liberando os itens do remetente."""
    receiver_id = _require_user_id(x_user_id)
    offer = await TradeService.decline_offer(db=db, receiver_id=receiver_id, offer_id=offer_id)
    return offer


@router.get("/trades/received", response_model=TradeOfferPage, status_code=status.HTTP_200_OK)
def list_received_offers(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    status_filter: Optional[str] = Query(None, alias="status", description=f"Um de: {sorted(TRADE_STATUSES)}"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Ofertas recebidas pelo usuário autenticado (L-08)."""
    receiver_id = _require_user_id(x_user_id)
    _validate_status_filter(status_filter)
    items, total = TradeService.get_received_offers(
        db=db, receiver_id=receiver_id, status_filter=status_filter, skip=skip, limit=limit
    )
    return TradeOfferPage(items=items, total=total, skip=skip, limit=limit)


@router.get("/trades/sent", response_model=TradeOfferPage, status_code=status.HTTP_200_OK)
def list_sent_offers(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    status_filter: Optional[str] = Query(None, alias="status", description=f"Um de: {sorted(TRADE_STATUSES)}"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Ofertas enviadas pelo usuário autenticado (L-08)."""
    sender_id = _require_user_id(x_user_id)
    _validate_status_filter(status_filter)
    items, total = TradeService.get_sent_offers(
        db=db, sender_id=sender_id, status_filter=status_filter, skip=skip, limit=limit
    )
    return TradeOfferPage(items=items, total=total, skip=skip, limit=limit)
