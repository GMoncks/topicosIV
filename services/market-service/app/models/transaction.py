from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, Integer, String, Text
from app.db.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


# Tipos aceitos para um lançamento no extrato da carteira.
TRANSACTION_TYPES = {"compra", "venda", "recarga", "resgate"}

# Direção do lançamento no saldo: crédito (entra) ou débito (sai).
# "amount" é sempre armazenado como magnitude positiva; a direção vem do tipo.
CREDIT_TYPES = {"venda", "recarga", "resgate"}
DEBIT_TYPES = {"compra"}


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, index=True, nullable=False)
    type = Column(String(20), index=True, nullable=False)  # compra, venda, recarga, resgate
    amount = Column(Float, nullable=False)  # magnitude positiva; direção depende do type
    description = Column(Text, nullable=False)
    created_at = Column(DateTime, default=_utcnow, index=True, nullable=False)
