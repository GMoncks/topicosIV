from datetime import datetime, timezone
from typing import List, Optional, Tuple
import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.trade import TradeOffer
from app.schemas.trade import TradeOfferCreate
from app.services.inventory_client import InventoryClient


def _utcnow():
    return datetime.now(timezone.utc)


class TradeService:
    """
    Trocas diretas entre usuários (L-06 a L-08).

    Diferente do anúncio do Mercado, só os itens OFERECIDOS (do remetente) são
    bloqueados na criação da oferta — bloquear os itens solicitados do
    destinatário antes de ele sequer ver a proposta seria travar algo que ele
    ainda não concordou em trocar. Os itens solicitados só são validados e
    bloqueados no momento do aceite.
    """

    @staticmethod
    async def create_offer(
        db: Session, sender_id: int, payload: TradeOfferCreate, http_client: Optional[httpx.AsyncClient] = None
    ) -> TradeOffer:
        if sender_id == payload.receiver_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Você não pode propor uma troca para si mesmo.")

        for item in payload.offered_items:
            await InventoryClient.lock_item(sender_id, item.item_id, http_client)

        offer = TradeOffer(
            sender_id=sender_id,
            receiver_id=payload.receiver_id,
            offered_items=[item.model_dump() for item in payload.offered_items],
            requested_items=[item.model_dump() for item in payload.requested_items],
            status="pending",
        )
        db.add(offer)
        db.commit()
        db.refresh(offer)
        return offer

    @staticmethod
    def get_received_offers(
        db: Session, receiver_id: int, status_filter: Optional[str] = None, skip: int = 0, limit: int = 20
    ) -> Tuple[List[TradeOffer], int]:
        query = db.query(TradeOffer).filter(TradeOffer.receiver_id == receiver_id)
        if status_filter:
            query = query.filter(TradeOffer.status == status_filter)
        total = query.count()
        items = query.order_by(TradeOffer.created_at.desc(), TradeOffer.id.desc()).offset(skip).limit(limit).all()
        return items, total

    @staticmethod
    def get_sent_offers(
        db: Session, sender_id: int, status_filter: Optional[str] = None, skip: int = 0, limit: int = 20
    ) -> Tuple[List[TradeOffer], int]:
        query = db.query(TradeOffer).filter(TradeOffer.sender_id == sender_id)
        if status_filter:
            query = query.filter(TradeOffer.status == status_filter)
        total = query.count()
        items = query.order_by(TradeOffer.created_at.desc(), TradeOffer.id.desc()).offset(skip).limit(limit).all()
        return items, total

    @staticmethod
    def _get_pending_offer_for_receiver(db: Session, receiver_id: int, offer_id: int) -> TradeOffer:
        offer = db.query(TradeOffer).filter(TradeOffer.id == offer_id).first()
        if not offer:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Oferta de troca não encontrada.")
        if offer.receiver_id != receiver_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Apenas o destinatário pode responder a esta oferta.")
        if offer.status != "pending":
            raise HTTPException(status.HTTP_409_CONFLICT, "Esta oferta já foi respondida.")
        return offer

    @staticmethod
    async def accept_offer(
        db: Session, receiver_id: int, offer_id: int, http_client: Optional[httpx.AsyncClient] = None
    ) -> TradeOffer:
        offer = TradeService._get_pending_offer_for_receiver(db, receiver_id, offer_id)

        # Só agora validamos e bloqueamos os itens solicitados (o destinatário acabou de concordar).
        for item in offer.requested_items:
            await InventoryClient.lock_item(receiver_id, item["item_id"], http_client)

        completed: List[Tuple[int, int, int]] = []  # (item_id, from_user_id, to_user_id) já transferidos

        async def _transfer_or_rollback(item_id: int, from_user_id: int, to_user_id: int) -> None:
            ok = await InventoryClient.transfer_item(item_id, from_user_id, to_user_id, http_client)
            if not ok:
                for prev_item_id, prev_from, prev_to in reversed(completed):
                    await InventoryClient.transfer_item(prev_item_id, prev_to, prev_from, http_client)
                raise HTTPException(
                    status.HTTP_502_BAD_GATEWAY,
                    "Falha ao transferir um dos itens. Troca revertida integralmente.",
                )
            completed.append((item_id, from_user_id, to_user_id))

        for item in offer.offered_items:
            await _transfer_or_rollback(item["item_id"], offer.sender_id, receiver_id)
        for item in offer.requested_items:
            await _transfer_or_rollback(item["item_id"], receiver_id, offer.sender_id)

        offer.status = "accepted"
        offer.responded_at = _utcnow()
        db.commit()
        db.refresh(offer)
        return offer

    @staticmethod
    async def decline_offer(
        db: Session, receiver_id: int, offer_id: int, http_client: Optional[httpx.AsyncClient] = None
    ) -> TradeOffer:
        offer = TradeService._get_pending_offer_for_receiver(db, receiver_id, offer_id)

        # Libera os itens ofertados pelo remetente, que estavam bloqueados desde a criação.
        for item in offer.offered_items:
            await InventoryClient.unlock_item(offer.sender_id, item["item_id"], http_client)

        offer.status = "declined"
        offer.responded_at = _utcnow()
        db.commit()
        db.refresh(offer)
        return offer
