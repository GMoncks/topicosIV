import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import bcrypt
import jwt
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.user import User
from app.schemas.user import UserRegisterRequest

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "mist_super_secret_jwt_key_development_secret_32bytes")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

DEFAULT_DEV_SECRET = "mist_super_secret_jwt_key_development_secret_32bytes"

if ENVIRONMENT == "production":
    if not SECRET_KEY or SECRET_KEY == DEFAULT_DEV_SECRET or len(SECRET_KEY) < 32:
        raise RuntimeError(
            "Configuração Insegura: Em ambiente de produção, a variável JWT_SECRET_KEY "
            "deve ser configurada com uma chave forte de no mínimo 32 caracteres e não pode ser o valor padrão."
        )



def hash_password(password: str) -> str:
    """Gera o hash seguro da senha utilizando bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica a senha em texto plano contra o hash bcrypt."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Gera um novo token JWT assinado."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    """Valida e decodifica um token JWT."""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def authenticate_user(db: Session, username_or_email: str, password: str) -> Optional[User]:
    user = db.query(User).filter(
        or_(User.username == username_or_email, User.email == username_or_email)
    ).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def create_user(db: Session, user_data: UserRegisterRequest) -> User:
    hashed_pwd = hash_password(user_data.password)
    # Avatar padrão amigável baseado nas iniciais do usuário
    default_avatar = f"https://api.dicebear.com/7.x/bottts/svg?seed={user_data.username}"
    
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_pwd,
        wallet_balance=200.0,
        points_balance=500,
        level=1,
        avatar_url=default_avatar
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def debit_wallet(db: Session, user_id: int, amount: float) -> Dict[str, Any]:
    """
    Debita saldo da carteira do usuário de forma atômica e segura contra concorrência.
    """
    user = get_user_by_id(db, user_id)
    if not user:
        raise ValueError("Usuário não encontrado")

    previous_balance = float(user.wallet_balance)

    # Se a compra for gratuita (amount == 0.0), não há alteração de saldo
    if amount == 0.0:
        return {
            "user_id": user_id,
            "previous_balance": round(previous_balance, 2),
            "amount": 0.0,
            "new_balance": round(previous_balance, 2),
            "operation": "debit"
        }

    # Atualização atômica condicional prevenindo double-spending e saldo negativo
    result = db.query(User).filter(
        User.id == user_id,
        User.wallet_balance >= amount
    ).update(
        {User.wallet_balance: User.wallet_balance - amount},
        synchronize_session="fetch"
    )

    if result == 0:
        raise ValueError("Saldo insuficiente na carteira MIST")

    db.commit()
    db.refresh(user)

    return {
        "user_id": user_id,
        "previous_balance": round(previous_balance, 2),
        "amount": round(amount, 2),
        "new_balance": round(float(user.wallet_balance), 2),
        "operation": "debit"
    }


def credit_wallet(db: Session, user_id: int, amount: float) -> Dict[str, Any]:
    """
    Credita saldo na carteira do usuário (utilizado para estornos/compensações de Saga ou recargas).
    """
    user = get_user_by_id(db, user_id)
    if not user:
        raise ValueError("Usuário não encontrado")

    previous_balance = float(user.wallet_balance)

    if amount == 0.0:
        return {
            "user_id": user_id,
            "previous_balance": round(previous_balance, 2),
            "amount": 0.0,
            "new_balance": round(previous_balance, 2),
            "operation": "credit"
        }

    db.query(User).filter(User.id == user_id).update(
        {User.wallet_balance: User.wallet_balance + amount},
        synchronize_session="fetch"
    )
    db.commit()
    db.refresh(user)

    return {
        "user_id": user_id,
        "previous_balance": round(previous_balance, 2),
        "amount": round(amount, 2),
        "new_balance": round(float(user.wallet_balance), 2),
        "operation": "credit"
    }


from app.models.inventory import InventoryItem
from app.constants.points_shop_catalog import POINTS_SHOP_CATALOG, get_catalog_item


def credit_points(db: Session, user_id: int, amount: int) -> Dict[str, Any]:
    """Credita Pontos MIST de forma atômica na conta do usuário."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise ValueError("Usuário não encontrado")
    if amount <= 0:
        raise ValueError("O montante de pontos a creditar deve ser positivo")

    previous_balance = int(user.points_balance)
    db.query(User).filter(User.id == user_id).update(
        {User.points_balance: User.points_balance + amount},
        synchronize_session="fetch"
    )
    db.commit()
    db.refresh(user)

    return {
        "user_id": user_id,
        "previous_balance": previous_balance,
        "amount": amount,
        "new_balance": int(user.points_balance),
        "operation": "credit"
    }


def get_points_shop_items(db: Session, user_id: Optional[int] = None) -> list:
    """Retorna itens do catálogo da Loja de Pontos marcando quais o usuário já possui."""
    owned_ids = set()
    if user_id:
        items = db.query(InventoryItem.item_id).filter(InventoryItem.user_id == user_id).all()
        owned_ids = {i[0] for i in items}

    catalog = []
    for item in POINTS_SHOP_CATALOG:
        catalog.append({
            **item,
            "is_owned": item["id"] in owned_ids
        })
    return catalog


def purchase_points_item(db: Session, user_id: int, item_id: str) -> Dict[str, Any]:
    """Deduz pontos e adiciona cosmético ao inventário do usuário."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise ValueError("Usuário não encontrado")

    catalog_item = get_catalog_item(item_id)
    if not catalog_item:
        raise LookupError(f"Item cosmético '{item_id}' não encontrado no catálogo da Loja de Pontos")

    existing = db.query(InventoryItem).filter(
        InventoryItem.user_id == user_id,
        InventoryItem.item_id == item_id
    ).first()
    if existing:
        raise KeyError("Você já possui este item cosmético em seu inventário")

    price = catalog_item["price_points"]
    if user.points_balance < price:
        raise ValueError(f"Saldo insuficiente de Pontos MIST. Necessário: {price}, Atual: {user.points_balance}")

    # Dedução atômica condicional
    result = db.query(User).filter(
        User.id == user_id,
        User.points_balance >= price
    ).update(
        {User.points_balance: User.points_balance - price},
        synchronize_session="fetch"
    )
    if result == 0:
        raise ValueError("Saldo insuficiente de Pontos MIST")

    new_item = InventoryItem(
        user_id=user_id,
        item_id=catalog_item["id"],
        name=catalog_item["name"],
        item_type=catalog_item["item_type"],
        asset_url=catalog_item["asset_url"],
        price_points=price,
        is_equipped=False
    )
    db.add(new_item)
    db.commit()
    db.refresh(user)
    db.refresh(new_item)

    return {
        "success": True,
        "message": f"Cosmético '{catalog_item['name']}' resgatado com sucesso!",
        "item": new_item,
        "new_points_balance": int(user.points_balance)
    }


def equip_cosmetic(db: Session, user_id: int, inventory_item_id: int, action: str = "equip") -> Dict[str, Any]:
    """Equipa ou desequipa cosmético (moldura ou background) e atualiza o perfil."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise ValueError("Usuário não encontrado")

    item = db.query(InventoryItem).filter(
        InventoryItem.id == inventory_item_id,
        InventoryItem.user_id == user_id
    ).first()
    if not item:
        raise LookupError("Item cosmético não encontrado no seu inventário")

    if action == "unequip":
        item.is_equipped = False
        if item.item_type == "avatar_frame":
            user.avatar_frame_url = None
        elif item.item_type == "background":
            user.profile_background_url = None
        db.commit()
        db.refresh(user)
        db.refresh(item)
        return {
            "success": True,
            "message": f"'{item.name}' desequipado com sucesso",
            "equipped_item": item,
            "avatar_frame_url": user.avatar_frame_url,
            "profile_background_url": user.profile_background_url
        }

    # Desequipa outros do mesmo tipo pertencentes ao usuário
    db.query(InventoryItem).filter(
        InventoryItem.user_id == user_id,
        InventoryItem.item_type == item.item_type,
        InventoryItem.id != item.id
    ).update({"is_equipped": False}, synchronize_session="fetch")

    item.is_equipped = True
    if item.item_type == "avatar_frame":
        user.avatar_frame_url = item.asset_url
    elif item.item_type == "background":
        user.profile_background_url = item.asset_url

    db.commit()
    db.refresh(user)
    db.refresh(item)

    return {
        "success": True,
        "message": f"'{item.name}' equipado com sucesso!",
        "equipped_item": item,
        "avatar_frame_url": user.avatar_frame_url,
        "profile_background_url": user.profile_background_url
    }


def get_user_inventory(db: Session, user_id: int, item_type: Optional[str] = None):
    """Lista todos os itens de cosméticos adquiridos pelo usuário."""
    query = db.query(InventoryItem).filter(InventoryItem.user_id == user_id)
    if item_type:
        query = query.filter(InventoryItem.item_type == item_type)
    return query.order_by(InventoryItem.acquired_at.desc()).all()

