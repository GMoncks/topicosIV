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


def equip_inventory_item(db: Session, user_id: int, inventory_item_id: int) -> Dict[str, Any]:
    """Equipa um item do inventário do usuário e atualiza seu perfil visual."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise ValueError("Usuário não encontrado")

    item = db.query(InventoryItem).filter(
        InventoryItem.id == inventory_item_id,
        InventoryItem.user_id == user_id
    ).first()
    if not item:
        raise LookupError("Item não encontrado no seu inventário")

    if item.status == "listado":
        raise ValueError("Item listado no mercado não pode ser equipado.")

    # Desequipa itens anteriores do mesmo tipo pertencentes ao usuário
    db.query(InventoryItem).filter(
        InventoryItem.user_id == user_id,
        InventoryItem.item_type == item.item_type,
        InventoryItem.id != item.id
    ).update({"is_equipped": False, "status": "disponivel"}, synchronize_session="fetch")

    item.is_equipped = True
    item.status = "equipado"

    if item.item_type in ("avatar_frame", "moldura"):
        user.avatar_frame_url = item.asset_url
    elif item.item_type in ("background", "plano_de_fundo"):
        user.profile_background_url = item.asset_url
    elif item.item_type in ("avatar",):
        user.avatar_url = item.asset_url

    db.commit()
    db.refresh(user)
    db.refresh(item)

    return {
        "success": True,
        "message": f"'{item.name}' equipado com sucesso!",
        "equipped_item": item,
        "avatar_url": user.avatar_url,
        "avatar_frame_url": user.avatar_frame_url,
        "profile_background_url": user.profile_background_url
    }


def unequip_inventory_item(db: Session, user_id: int, inventory_item_id: int) -> Dict[str, Any]:
    """Desequipa um item do inventário e limpa o cosmético correspondente no perfil."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise ValueError("Usuário não encontrado")

    item = db.query(InventoryItem).filter(
        InventoryItem.id == inventory_item_id,
        InventoryItem.user_id == user_id
    ).first()
    if not item:
        raise LookupError("Item não encontrado no seu inventário")

    item.is_equipped = False
    item.status = "disponivel"

    if item.item_type in ("avatar_frame", "moldura") and user.avatar_frame_url == item.asset_url:
        user.avatar_frame_url = None
    elif item.item_type in ("background", "plano_de_fundo") and user.profile_background_url == item.asset_url:
        user.profile_background_url = None
    elif item.item_type in ("avatar",) and user.avatar_url == item.asset_url:
        pass  # Mantém avatar atual ou volta ao padrão

    db.commit()
    db.refresh(user)
    db.refresh(item)

    return {
        "success": True,
        "message": f"'{item.name}' desequipado com sucesso",
        "equipped_item": item,
        "avatar_url": user.avatar_url,
        "avatar_frame_url": user.avatar_frame_url,
        "profile_background_url": user.profile_background_url
    }


def equip_cosmetic(db: Session, user_id: int, inventory_item_id: int, action: str = "equip") -> Dict[str, Any]:
    """Retrocompatibilidade com a rota /profile/equip."""
    if action == "unequip":
        return unequip_inventory_item(db, user_id=user_id, inventory_item_id=inventory_item_id)
    return equip_inventory_item(db, user_id=user_id, inventory_item_id=inventory_item_id)


def lock_inventory_item(db: Session, user_id: int, item_id: int) -> InventoryItem:
    """Bloqueia item para anúncio ou oferta de troca no Mercado da Comunidade."""
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise LookupError("Item não encontrado no inventário.")
    if item.user_id != user_id:
        raise PermissionError("Você não é o dono deste item.")
    if item.status != "disponivel" or item.is_equipped:
        raise RuntimeError("Este item já está em uso ou anunciado.")

    item.status = "listado"
    item.is_equipped = False
    db.commit()
    db.refresh(item)
    return item


def unlock_inventory_item(db: Session, user_id: int, item_id: int) -> InventoryItem:
    """Libera item da custódia do Mercado retornando ao estado disponível."""
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise LookupError("Item não encontrado no inventário.")
    if item.user_id != user_id:
        raise PermissionError("Você não é o dono deste item.")

    item.status = "disponivel"
    db.commit()
    db.refresh(item)
    return item


def transfer_inventory_item(db: Session, item_id: int, from_user_id: int, to_user_id: int) -> InventoryItem:
    """Transfere a posse de um item entre dois usuários (após venda ou troca)."""
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise LookupError("Item não encontrado no inventário.")
    if item.user_id != from_user_id:
        raise PermissionError("O item não pertence ao usuário de origem.")

    item.user_id = to_user_id
    item.status = "disponivel"
    item.is_equipped = False
    db.commit()
    db.refresh(item)
    return item


def get_user_inventory(
    db: Session,
    user_id: int,
    item_type: Optional[str] = None,
    status_filter: Optional[str] = None
) -> Dict[str, Any]:
    """Lista todos os itens do inventário do usuário, com suporte a filtros e agrupamento por tipo."""
    query = db.query(InventoryItem).filter(InventoryItem.user_id == user_id)
    if item_type:
        query = query.filter(InventoryItem.item_type == item_type)
    if status_filter:
        query = query.filter(InventoryItem.status == status_filter)

    items = query.order_by(InventoryItem.acquired_at.desc()).all()

    # Todos os itens do usuário para compor o agrupamento por abas de categorias
    all_user_items = db.query(InventoryItem).filter(InventoryItem.user_id == user_id).order_by(InventoryItem.acquired_at.desc()).all()
    grouped: Dict[str, list] = {
        "card": [],
        "emoticon": [],
        "background": [],
        "avatar_frame": [],
        "avatar": [],
        "badge": []
    }
    for i in all_user_items:
        t = i.item_type
        if t not in grouped:
            grouped[t] = []
        grouped[t].append(i)

    return {
        "items": items,
        "grouped": grouped,
        "total": len(items)
    }


def search_users(db: Session, query: str, limit: int = 10):
    """Busca usuários por correspondência parcial de username ou email."""
    if not query or not query.strip():
        return []
    term = f"%{query.strip()}%"
    return (
        db.query(User)
        .filter(
            or_(
                User.username.ilike(term),
                User.email.ilike(term),
            )
        )
        .limit(limit)
        .all()
    )


def get_user_level_progress(db: Session, user_id: int) -> Dict[str, Any]:
    """Retorna o progresso de XP e nível do usuário."""
    from app.services.xp_service import get_level_progress
    user = get_user_by_id(db, user_id)
    if not user:
        raise LookupError("Usuário não encontrado.")
    total_xp = getattr(user, "total_xp", 100) or 100
    return get_level_progress(total_xp)


def get_catalog_cards(db: Session, game_id: Optional[int] = None):
    """Retorna as cartas colecionáveis cadastradas, garantindo integridade com jogos."""
    from app.services.card_catalog_service import ensure_catalog_seeded, get_or_create_game_cards
    ensure_catalog_seeded(db)
    if game_id:
        return get_or_create_game_cards(db, game_id)
    from app.models.trading_card import TradingCard
    return db.query(TradingCard).all()


def grant_card_to_user(
    db: Session,
    user_id: int,
    game_id: int,
    card_id: Optional[int] = None,
    is_foil: bool = False,
    rarity: Optional[str] = None
):
    """Concede uma carta colecionável ao usuário, gerando cartas dinâmicas se necessário."""
    import random
    from app.services.card_catalog_service import ensure_catalog_seeded, get_or_create_game_cards
    from app.models.trading_card import TradingCard

    ensure_catalog_seeded(db)
    user = get_user_by_id(db, user_id)
    if not user:
        raise LookupError("Usuário não encontrado.")

    cards = get_or_create_game_cards(db, game_id)
    selected_card = None

    if card_id:
        selected_card = next((c for c in cards if c.id == card_id), None)
        if not selected_card:
            selected_card = db.query(TradingCard).filter(TradingCard.id == card_id).first()

    if not selected_card and rarity:
        matching = [c for c in cards if c.rarity.lower() == rarity.lower()]
        if matching:
            selected_card = random.choice(matching)

    if not selected_card:
        selected_card = random.choice(cards)

    now = datetime.now(timezone.utc)
    card_name = f"{selected_card.card_name}{' (Foil)' if is_foil else ''}"
    inv_item = InventoryItem(
        user_id=user_id,
        item_id=f"card_{game_id}_{selected_card.id}_{int(now.timestamp())}_{random.randint(100, 999)}",
        name=card_name,
        item_type="card",
        asset_url=selected_card.card_art_url,
        price_points=0,
        is_equipped=False,
        status="disponivel",
        game_id=game_id,
        rarity="Foil Especial" if is_foil else selected_card.rarity,
        description=selected_card.description or f"Carta colecionável do jogo #{game_id}.",
        acquired_at=now
    )
    db.add(inv_item)
    db.commit()
    db.refresh(inv_item)
    return inv_item, selected_card


def get_user_badges(db: Session, user_id: int):
    """Retorna todas as insígnias obtidas pelo usuário em seu inventário."""
    return (
        db.query(InventoryItem)
        .filter(InventoryItem.user_id == user_id, InventoryItem.item_type == "badge")
        .order_by(InventoryItem.acquired_at.desc())
        .all()
    )


def craft_badge(db: Session, user_id: int, game_id: int, is_foil: bool = False) -> Dict[str, Any]:
    """Forja uma insígnia a partir do set completo de cartas do jogo."""
    from app.services.card_catalog_service import ensure_catalog_seeded, get_or_create_game_cards, get_or_create_game_badge
    from app.services.xp_service import add_xp

    ensure_catalog_seeded(db)
    user = get_user_by_id(db, user_id)
    if not user:
        raise LookupError("Usuário não encontrado.")

    required_cards = get_or_create_game_cards(db, game_id)
    if not required_cards:
        raise ValueError(f"Não há cartas cadastradas para o jogo #{game_id}.")

    # Busca as cartas disponíveis do usuário para este jogo
    user_cards = (
        db.query(InventoryItem)
        .filter(
            InventoryItem.user_id == user_id,
            InventoryItem.item_type == "card",
            InventoryItem.game_id == game_id,
            InventoryItem.status == "disponivel"
        )
        .all()
    )

    # Identifica se todas as cartas requeridas do set estão presentes
    consumed_items = []
    used_item_ids = set()

    for req in required_cards:
        # Busca um item disponível que corresponda ao nome da carta
        match = None
        for uc in user_cards:
            if uc.id not in used_item_ids and (req.card_name.lower() in uc.name.lower()):
                match = uc
                break
        if not match:
            # Caso os nomes tenham sido gerados com padrão levemente diferente, tenta correspondência por rarity/item_id
            for uc in user_cards:
                if uc.id not in used_item_ids and uc.rarity == req.rarity:
                    match = uc
                    break

        if not match:
            raise ValueError(
                f"Set incompleto! Você precisa de todas as {len(required_cards)} cartas do jogo para forjar a insígnia. "
                f"Carta ausente: '{req.card_name}'."
            )
        consumed_items.append(match)
        used_item_ids.add(match.id)

    # Remove/consome as cartas do inventário
    for item in consumed_items:
        db.delete(item)

    # Obtém a Badge do jogo
    badge = get_or_create_game_badge(db, game_id, is_foil=is_foil)

    now = datetime.now(timezone.utc)
    badge_item = InventoryItem(
        user_id=user_id,
        item_id=f"badge_{game_id}_{int(now.timestamp())}",
        name=badge.name,
        item_type="badge",
        asset_url=badge.icon_url,
        price_points=0,
        is_equipped=False,
        status="disponivel",
        game_id=game_id,
        rarity="Foil Especial" if is_foil else "Especial",
        description=badge.description or f"Insígnia forjada por completar o set do jogo #{game_id}.",
        acquired_at=now
    )
    db.add(badge_item)

    # Concede XP ao usuário e recalcula o nível
    user, leveled_up = add_xp(user, badge.xp_value)

    db.commit()
    db.refresh(badge_item)
    db.refresh(user)

    return {
        "badge": badge,
        "badge_item": badge_item,
        "new_level": user.level,
        "new_total_xp": user.total_xp,
        "leveled_up": leveled_up,
        "xp_gained": badge.xp_value,
        "consumed_cards_count": len(consumed_items)
    }


def update_user_profile(
    db: Session,
    user_id: int,
    username: Optional[str] = None,
    display_name: Optional[str] = None,
    avatar_url: Optional[str] = None,
    bio: Optional[str] = None,
    location: Optional[str] = None
) -> User:
    """Atualiza dados do perfil do usuário com validação de unicidade de username."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise ValueError("Usuário não encontrado")

    if username and username.strip() and username.strip() != user.username:
        new_username = username.strip()
        existing = db.query(User).filter(User.username == new_username, User.id != user_id).first()
        if existing:
            raise ValueError(f"O nome de usuário '{new_username}' já está em uso.")
        user.username = new_username

    if display_name is not None:
        user.real_name = display_name.strip() if display_name else None

    if avatar_url is not None and avatar_url.strip():
        user.avatar_url = avatar_url.strip()

    if bio is not None:
        user.bio = bio.strip()

    if location is not None:
        user.location = location.strip()

    db.commit()
    db.refresh(user)
    return user



