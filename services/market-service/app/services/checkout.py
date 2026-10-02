from datetime import datetime, timezone
from typing import Optional
import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import AUTH_SERVICE_URL
from app.models.listing import MarketListing
from app.services.inventory_client import InventoryClient
from app.services.wallet_ledger import WalletLedger


def _utcnow():
    return datetime.now(timezone.utc)


class MarketCheckoutService:
    """
    Compra de um anúncio do Mercado (L-05): transferência atômica de saldo
    (via auth-service) e custódia do item (via auth-service, Bloco J — Dev 2).

    Ordem das operações, espelhando o Saga do checkout de jogos no
    store-service (débito -> concessão -> compensação em caso de falha):
      1. Débito do comprador.
      2. Crédito do vendedor — se falhar, estorna o comprador.
      3. Transferência de custódia do item — se falhar, estorna comprador E
         vendedor (reverte o crédito).
      4. Persistência local (listing vendido) e extrato da carteira (T-02,
         best-effort) para ambas as partes.
    """

    @staticmethod
    async def buy_listing(
        db: Session,
        buyer_id: int,
        listing_id: int,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> dict:
        listing = db.query(MarketListing).filter(MarketListing.id == listing_id).first()
        if not listing:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Anúncio não encontrado.")
        if listing.status != "ativo":
            raise HTTPException(status.HTTP_409_CONFLICT, "Este anúncio não está mais disponível.")
        if listing.seller_id == buyer_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Você não pode comprar seu próprio anúncio.")

        owns_client = False
        client = http_client
        if client is None:
            client = httpx.AsyncClient(timeout=10.0)
            owns_client = True

        auth_url = AUTH_SERVICE_URL.rstrip("/")

        try:
            # 1. Débito do comprador
            try:
                debit_resp = await client.post(
                    f"{auth_url}/users/{buyer_id}/wallet/debit", json={"amount": listing.price}
                )
            except httpx.HTTPError as net_err:
                raise HTTPException(
                    status.HTTP_503_SERVICE_UNAVAILABLE,
                    f"Não foi possível processar o pagamento: {net_err}",
                )
            if debit_resp.status_code == 400:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Saldo insuficiente na carteira MIST.")
            if debit_resp.status_code != 200:
                raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Falha ao debitar a carteira do comprador.")
            new_balance = debit_resp.json().get("new_balance")

            # 2. Crédito do vendedor — compensa o comprador se falhar
            seller_credited = False
            try:
                credit_resp = await client.post(
                    f"{auth_url}/users/{listing.seller_id}/wallet/credit", json={"amount": listing.price}
                )
                seller_credited = credit_resp.status_code == 200
            except httpx.HTTPError:
                seller_credited = False

            if not seller_credited:
                await MarketCheckoutService._refund(client, auth_url, buyer_id, listing.price)
                raise HTTPException(
                    status.HTTP_502_BAD_GATEWAY,
                    "Falha ao repassar o pagamento ao vendedor. Compra estornada integralmente.",
                )

            # 3. Transferência de custódia do item — compensa ambos os saldos se falhar
            transferred = await InventoryClient.transfer_item(
                listing.item_id, listing.seller_id, buyer_id, client
            )

            if not transferred:
                await MarketCheckoutService._refund(client, auth_url, buyer_id, listing.price)
                await MarketCheckoutService._reverse_credit(client, auth_url, listing.seller_id, listing.price)
                raise HTTPException(
                    status.HTTP_502_BAD_GATEWAY,
                    "Falha ao transferir a posse do item. Compra estornada integralmente.",
                )

            # 4. Persistência local
            listing.status = "vendido"
            listing.buyer_id = buyer_id
            listing.sold_at = _utcnow()
            db.commit()
            db.refresh(listing)

            # 5. Extrato da carteira (T-02) — best-effort, não desfaz a compra se falhar
            item_label = listing.item_name or f"{listing.item_type} #{listing.item_id}"
            try:
                WalletLedger.record_transaction(
                    db=db,
                    user_id=buyer_id,
                    type="compra",
                    amount=listing.price,
                    description=f"Compra no mercado: {item_label}",
                )
            except Exception:
                pass
            try:
                WalletLedger.record_transaction(
                    db=db,
                    user_id=listing.seller_id,
                    type="venda",
                    amount=listing.price,
                    description=f"Venda no mercado: {item_label}",
                )
            except Exception:
                pass

            return {"listing": listing, "new_wallet_balance": new_balance}
        finally:
            if owns_client:
                await client.aclose()

    @staticmethod
    async def _refund(client: httpx.AsyncClient, auth_url: str, buyer_id: int, amount: float) -> None:
        try:
            await client.post(f"{auth_url}/users/{buyer_id}/wallet/credit", json={"amount": amount})
        except Exception:
            pass

    @staticmethod
    async def _reverse_credit(client: httpx.AsyncClient, auth_url: str, seller_id: int, amount: float) -> None:
        try:
            await client.post(f"{auth_url}/users/{seller_id}/wallet/debit", json={"amount": amount})
        except Exception:
            pass
