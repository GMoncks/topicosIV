from typing import Optional
import httpx
from fastapi import HTTPException, status

from app.config import AUTH_SERVICE_URL


class InventoryClient:
    """
    Cliente para o contrato assumido com o auth-service (Bloco J — Inventário,
    Dev 2, ainda não implementado). Centraliza lock/unlock/transfer de itens,
    usados por `listing_service.py`, `checkout.py` e `trade_service.py`.

    Falha fechada: qualquer indisponibilidade do auth-service interrompe a
    operação em vez de deixar um item "solto" ou trocado parcialmente.
    """

    @staticmethod
    async def _post(path: str, payload: dict, http_client: Optional[httpx.AsyncClient]) -> Optional[httpx.Response]:
        client = http_client or httpx.AsyncClient(timeout=10.0)
        try:
            return await client.post(f"{AUTH_SERVICE_URL.rstrip('/')}{path}", json=payload)
        except httpx.HTTPError:
            return None
        finally:
            if http_client is None:
                await client.aclose()

    @staticmethod
    def _raise_for_lock_response(resp: Optional[httpx.Response], action: str) -> dict:
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
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, f"Falha ao {action} o item no inventário.")
        return resp.json()

    @staticmethod
    async def lock_item(user_id: int, item_id: int, http_client: Optional[httpx.AsyncClient] = None) -> dict:
        resp = await InventoryClient._post(f"/inventory/items/{item_id}/lock", {"user_id": user_id}, http_client)
        return InventoryClient._raise_for_lock_response(resp, "bloquear")

    @staticmethod
    async def unlock_item(user_id: int, item_id: int, http_client: Optional[httpx.AsyncClient] = None) -> dict:
        resp = await InventoryClient._post(f"/inventory/items/{item_id}/unlock", {"user_id": user_id}, http_client)
        return InventoryClient._raise_for_lock_response(resp, "liberar")

    @staticmethod
    async def transfer_item(
        item_id: int, from_user_id: int, to_user_id: int, http_client: Optional[httpx.AsyncClient] = None
    ) -> bool:
        """Não levanta exceção: quem chama decide como compensar uma falha de transferência."""
        resp = await InventoryClient._post(
            "/inventory/transfer",
            {"item_id": item_id, "from_user_id": from_user_id, "to_user_id": to_user_id},
            http_client,
        )
        return resp is not None and resp.status_code == 200
