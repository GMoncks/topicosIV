from datetime import datetime
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.transaction import CREDIT_TYPES, TRANSACTION_TYPES, WalletTransaction


class WalletLedger:
    """
    Serviço de registro contábil (ledger) da carteira MIST.

    Importante: este serviço NÃO move saldo real — o saldo autoritativo vive no
    auth-service (`wallet_balance`). Aqui só é gravado o histórico/extrato,
    acionado por quem já executou a movimentação de saldo de fato (ex.:
    store-service após o checkout, ou o próprio market-service em compras/vendas
    e trocas do mercado).
    """

    @staticmethod
    def direction_for_type(transaction_type: str) -> str:
        return "credit" if transaction_type in CREDIT_TYPES else "debit"

    @staticmethod
    def record_transaction(
        db: Session,
        user_id: int,
        type: str,
        amount: float,
        description: str,
    ) -> WalletTransaction:
        if type not in TRANSACTION_TYPES:
            raise ValueError(f"Tipo de transação inválido: {type}")
        if amount <= 0:
            raise ValueError("O valor da transação deve ser positivo.")

        transaction = WalletTransaction(
            user_id=user_id,
            type=type,
            amount=amount,
            description=description.strip(),
        )
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        return transaction

    @staticmethod
    def get_history(
        db: Session,
        user_id: int,
        type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[WalletTransaction], int]:
        query = db.query(WalletTransaction).filter(WalletTransaction.user_id == user_id)
        if type:
            query = query.filter(WalletTransaction.type == type)
        if start_date:
            query = query.filter(WalletTransaction.created_at >= start_date)
        if end_date:
            query = query.filter(WalletTransaction.created_at <= end_date)

        total = query.count()
        items = (
            query.order_by(WalletTransaction.created_at.desc(), WalletTransaction.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return items, total
