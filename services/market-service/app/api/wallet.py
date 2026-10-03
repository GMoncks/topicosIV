from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.transaction import TRANSACTION_TYPES, WalletTransaction
from app.schemas.wallet import WalletHistoryResponse, WalletTransactionCreate, WalletTransactionResponse
from app.services.wallet_ledger import WalletLedger

router = APIRouter(tags=["Wallet"])


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


def _to_response(transaction: WalletTransaction) -> WalletTransactionResponse:
    return WalletTransactionResponse(
        id=transaction.id,
        user_id=transaction.user_id,
        type=transaction.type,
        amount=transaction.amount,
        direction=WalletLedger.direction_for_type(transaction.type),
        description=transaction.description,
        created_at=transaction.created_at,
    )


@router.post(
    "/wallet/transactions",
    response_model=WalletTransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Endpoint interno para outros microsserviços registrarem um lançamento no extrato",
)
def record_wallet_transaction(payload: WalletTransactionCreate, db: Session = Depends(get_db)):
    """
    Chamado internamente (service-to-service, sem X-User-Id) por quem já executou
    a movimentação real de saldo — ex.: store-service após um checkout bem-sucedido.
    """
    transaction = WalletLedger.record_transaction(
        db=db,
        user_id=payload.user_id,
        type=payload.type,
        amount=payload.amount,
        description=payload.description,
    )
    return _to_response(transaction)


@router.get("/wallet/history", response_model=WalletHistoryResponse, status_code=status.HTTP_200_OK)
def get_wallet_history(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    type: Optional[str] = Query(None, description=f"Filtrar por tipo: {sorted(TRANSACTION_TYPES)}"),
    start_date: Optional[datetime] = Query(None, description="Data inicial (ISO 8601), inclusive"),
    end_date: Optional[datetime] = Query(None, description="Data final (ISO 8601), inclusive"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Extrato paginado da carteira do usuário autenticado, com filtro opcional por tipo e período."""
    user_id = _require_user_id(x_user_id)
    if type is not None and type not in TRANSACTION_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo inválido. Use um de: {sorted(TRANSACTION_TYPES)}",
        )

    items, total = WalletLedger.get_history(
        db=db,
        user_id=user_id,
        type=type,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit,
    )
    return WalletHistoryResponse(
        items=[_to_response(t) for t in items],
        total=total,
        skip=skip,
        limit=limit,
    )
