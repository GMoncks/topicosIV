from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.user import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserProfileResponse,
    UserProfileUpdateRequest,
    WalletDebitRequest,
    WalletCreditRequest,
    WalletOperationResponse,
    WalletRechargeRequest,
)
from app.schemas.inventory import (
    PointsCreditRequest,
    PointsOperationResponse,
    PointsShopItemResponse,
    PointsPurchaseRequest,
    PointsPurchaseResponse,
    CosmeticEquipRequest,
    CosmeticEquipResponse,
    InventoryListResponse,
    InventoryItemResponse,
    InventoryLockRequest,
    InventoryTransferRequest,
)
from app.services.auth_service import (
    get_user_by_username,
    get_user_by_email,
    get_user_by_id,
    search_users,
    create_user,
    authenticate_user,
    create_access_token,
    decode_access_token,
    debit_wallet,
    credit_wallet,
    update_user_profile,
    credit_points,
    get_points_shop_items,
    purchase_points_item,
    equip_cosmetic,
    equip_inventory_item,
    unequip_inventory_item,
    lock_inventory_item,
    unlock_inventory_item,
    transfer_inventory_item,
    get_user_inventory,
    get_user_level_progress,
    get_catalog_cards,
    grant_card_to_user,
    get_user_badges,
    craft_badge,
)
from app.schemas.trading_card import (
    TradingCardResponse,
    BadgeResponse,
    LevelProgressResponse,
    CardGrantRequest,
    CardGrantResponse,
    CraftBadgeRequest,
    CraftBadgeResponse,
)
from app.services.card_catalog_service import get_or_create_game_badge


router = APIRouter(tags=["Auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login", auto_error=False)


@router.get("/health")
def health_check():
    return {"status": "healthy", "service": "auth-service"}


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegisterRequest, db: Session = Depends(get_db)):
    if get_user_by_username(db, user_in.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nome de usuário já está em uso"
        )
    if get_user_by_email(db, user_in.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já está em uso"
        )

    user = create_user(db, user_in)
    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username, "email": user.email}
    )
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user
    )


@router.post("/login", response_model=TokenResponse)
def login(login_in: UserLoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, login_in.username_or_email, login_in.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email/usuário ou senha incorretos"
        )

    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username, "email": user.email}
    )
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user
    )


@router.get("/me", response_model=UserProfileResponse)
def get_current_user_profile(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Retorna o perfil do usuário atual.
    Suporta tanto o cabeçalho X-User-Id (injetado confiavelmente pelo API Gateway)
    quanto resolução direta de Bearer token (para testes e chamadas diretas).
    """
    user_id: Optional[int] = None

    if x_user_id:
        try:
            user_id = int(x_user_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID de usuário inválido")
    elif token:
        try:
            payload = decode_access_token(token)
            user_id = int(payload.get("sub"))
        except Exception:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado")

    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado")

    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    return user


@router.get("/users/search", response_model=List[UserProfileResponse], status_code=status.HTTP_200_OK)
def search_users_endpoint(
    q: Optional[str] = Query(None, description="Termo de busca por username ou email"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Busca pública de usuários por username ou email (para busca global e convites).
    """
    if not q or not q.strip():
        return []
    return search_users(db=db, query=q.strip(), limit=limit)


@router.get("/users/{user_id}", response_model=UserProfileResponse)
def get_user_profile_by_id(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Retorna o perfil público de um usuário por ID (para lista de amigos e feeds sociais).
    """
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    return user


@router.post(
    "/users/{user_id}/wallet/debit",
    response_model=WalletOperationResponse,
    status_code=status.HTTP_200_OK,
    summary="Debita saldo da carteira do usuário (operação atômica)"
)
def debit_user_wallet(
    user_id: int,
    payload: WalletDebitRequest,
    db: Session = Depends(get_db)
):
    try:
        return debit_wallet(db=db, user_id=user_id, amount=payload.amount)
    except ValueError as e:
        msg = str(e)
        if "não encontrado" in msg:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)


@router.post(
    "/users/{user_id}/wallet/credit",
    response_model=WalletOperationResponse,
    status_code=status.HTTP_200_OK,
    summary="Credita saldo na carteira do usuário (estorno compensatório Saga ou recarga)"
)
def credit_user_wallet(
    user_id: int,
    payload: WalletCreditRequest,
    db: Session = Depends(get_db)
):
    try:
        return credit_wallet(db=db, user_id=user_id, amount=payload.amount)
    except ValueError as e:
        msg = str(e)
        if "não encontrado" in msg:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)


def resolve_authenticated_user_id(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    token: Optional[str] = Depends(oauth2_scheme)
) -> int:
    """Extrai e valida ID do usuário via header X-User-Id ou token JWT."""
    if x_user_id:
        try:
            return int(x_user_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID de usuário inválido")
    elif token:
        try:
            payload = decode_access_token(token)
            return int(payload.get("sub"))
        except Exception:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado")
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado")


def optional_authenticated_user_id(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    token: Optional[str] = Depends(oauth2_scheme)
) -> Optional[int]:
    """Extrai ID do usuário caso esteja autenticado, caso contrário retorna None."""
    if x_user_id:
        try:
            return int(x_user_id)
        except ValueError:
            return None
    elif token:
        try:
            payload = decode_access_token(token)
            return int(payload.get("sub"))
        except Exception:
            return None
    return None


@router.patch("/me/profile", response_model=UserProfileResponse, status_code=status.HTTP_200_OK)
@router.patch("/auth/profile", response_model=UserProfileResponse, status_code=status.HTTP_200_OK)
def update_profile_endpoint(
    payload: UserProfileUpdateRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(resolve_authenticated_user_id)
):
    """
    Atualiza dados do perfil do usuário autenticado (nome de usuário, nome de exibição, avatar, bio, localização).
    """
    try:
        updated_user = update_user_profile(
            db=db,
            user_id=user_id,
            username=payload.username,
            display_name=payload.display_name,
            avatar_url=payload.avatar_url,
            bio=payload.bio,
            location=payload.location
        )
        return updated_user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/me/wallet/recharge", response_model=WalletOperationResponse, status_code=status.HTTP_200_OK)
@router.post("/auth/wallet/recharge", response_model=WalletOperationResponse, status_code=status.HTTP_200_OK)
async def recharge_wallet_endpoint(
    payload: WalletRechargeRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(resolve_authenticated_user_id)
):
    """
    Simula a recarga de créditos na carteira do usuário sem gateway externo de pagamento.
    Credita atomicamente no auth-service, registra WalletTransaction no market-service e notifica via social-service.
    """
    import os
    import httpx

    try:
        result = credit_wallet(db=db, user_id=user_id, amount=payload.amount)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    market_url = os.getenv("MARKET_SERVICE_URL", "http://market-service:8005")
    social_url = os.getenv("SOCIAL_SERVICE_URL", "http://social-service:8004")

    # 1. Registro da transação financeira no market-service
    for m_base in [market_url, "http://localhost:8005"]:
        try:
            async with httpx.AsyncClient(timeout=1.5) as client:
                await client.post(
                    f"{m_base}/wallet/transactions",
                    json={
                        "type": "recarga",
                        "amount": payload.amount,
                        "description": "Recarga de saldo na Carteira MIST"
                    },
                    headers={"X-User-Id": str(user_id)}
                )
            break
        except Exception:
            continue

    # 2. Notificação push de recarga confirmada via social-service
    for s_base in [social_url, "http://localhost:8004"]:
        try:
            async with httpx.AsyncClient(timeout=1.5) as client:
                await client.post(
                    f"{s_base}/notifications",
                    json={
                        "user_id": user_id,
                        "type": "wallet_deposit",
                        "title": "Recarga Confirmada",
                        "message": f"Recarga de R$ {payload.amount:.2f} concluída com sucesso na sua Carteira MIST.",
                        "payload": {"action": "open_wallet", "amount": payload.amount}
                    }
                )
            break
        except Exception:
            continue

    return WalletOperationResponse(
        user_id=user_id,
        previous_balance=result["previous_balance"],
        amount=result["amount"],
        new_balance=result["new_balance"],
        operation="recarga"
    )


@router.post(
    "/users/{user_id}/points/credit",
    response_model=PointsOperationResponse,
    status_code=status.HTTP_200_OK,
    summary="Credita Pontos MIST ao usuário (ex: após checkout de jogos ou premiações)"
)
def credit_user_points(
    user_id: int,
    payload: PointsCreditRequest,
    db: Session = Depends(get_db)
):
    try:
        return credit_points(db=db, user_id=user_id, amount=payload.amount)
    except ValueError as e:
        msg = str(e)
        if "não encontrado" in msg:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)


@router.get(
    "/points-shop/items",
    response_model=list[PointsShopItemResponse],
    status_code=status.HTTP_200_OK,
    summary="Lista itens disponíveis no catálogo da Loja de Pontos"
)
def list_points_shop_items(
    db: Session = Depends(get_db),
    user_id: Optional[int] = Depends(optional_authenticated_user_id)
):
    return get_points_shop_items(db=db, user_id=user_id)


@router.post(
    "/points-shop/purchase",
    response_model=PointsPurchaseResponse,
    status_code=status.HTTP_200_OK,
    summary="Resgata um item cosmético utilizando Pontos MIST"
)
def purchase_cosmetic_item(
    payload: PointsPurchaseRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(resolve_authenticated_user_id)
):
    try:
        return purchase_points_item(db=db, user_id=user_id, item_id=payload.item_id)
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e).strip("'\""))
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))



@router.post(
    "/profile/equip",
    response_model=CosmeticEquipResponse,
    status_code=status.HTTP_200_OK,
    summary="Equipa ou desequipa cosméticos (moldura de avatar, plano de fundo)"
)
def equip_profile_cosmetic(
    payload: CosmeticEquipRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(resolve_authenticated_user_id)
):
    try:
        return equip_cosmetic(
            db=db,
            user_id=user_id,
            inventory_item_id=payload.inventory_item_id,
            action=payload.action or "equip"
        )
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/inventory",
    response_model=InventoryListResponse,
    status_code=status.HTTP_200_OK,
    summary="Retorna todos os itens do inventário do usuário agrupados por tipo"
)
def get_inventory(
    item_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    user_id: int = Depends(resolve_authenticated_user_id)
):
    result = get_user_inventory(db=db, user_id=user_id, item_type=item_type, status_filter=status_filter)
    return InventoryListResponse(
        items=result["items"],
        grouped=result["grouped"],
        total=result["total"]
    )


@router.post(
    "/inventory/items/{item_id}/equip",
    response_model=CosmeticEquipResponse,
    status_code=status.HTTP_200_OK,
    summary="Equipa um item do inventário do usuário"
)
def equip_item(
    item_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(resolve_authenticated_user_id)
):
    try:
        return equip_inventory_item(db=db, user_id=user_id, inventory_item_id=item_id)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        if "listado" in str(e):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/inventory/items/{item_id}/unequip",
    response_model=CosmeticEquipResponse,
    status_code=status.HTTP_200_OK,
    summary="Desequipa um item do inventário do usuário"
)
def unequip_item(
    item_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(resolve_authenticated_user_id)
):
    try:
        return unequip_inventory_item(db=db, user_id=user_id, inventory_item_id=item_id)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/inventory/items/{item_id}/lock",
    response_model=InventoryItemResponse,
    status_code=status.HTTP_200_OK,
    summary="Bloqueia item em custódia para anúncio ou proposta de troca no Mercado"
)
def lock_item(
    item_id: int,
    payload: InventoryLockRequest,
    db: Session = Depends(get_db),
):
    try:
        return lock_inventory_item(db=db, user_id=payload.user_id, item_id=item_id)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.post(
    "/inventory/items/{item_id}/unlock",
    response_model=InventoryItemResponse,
    status_code=status.HTTP_200_OK,
    summary="Libera item de custódia do Mercado"
)
def unlock_item(
    item_id: int,
    payload: InventoryLockRequest,
    db: Session = Depends(get_db),
):
    try:
        return unlock_inventory_item(db=db, user_id=payload.user_id, item_id=item_id)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post(
    "/inventory/transfer",
    response_model=InventoryItemResponse,
    status_code=status.HTTP_200_OK,
    summary="Transfere item entre usuários"
)
def transfer_item(
    payload: InventoryTransferRequest,
    db: Session = Depends(get_db),
):
    try:
        return transfer_inventory_item(
            db=db,
            item_id=payload.item_id,
            from_user_id=payload.from_user_id,
            to_user_id=payload.to_user_id
        )
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get(
    "/me/level-progress",
    response_model=LevelProgressResponse,
    status_code=status.HTTP_200_OK,
    summary="Retorna progresso de nível e XP do usuário atual"
)
def get_my_level_progress(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    uid = None
    if x_user_id:
        try:
            uid = int(x_user_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID de usuário inválido")
    elif token:
        try:
            payload = decode_access_token(token)
            uid = int(payload.get("sub"))
        except Exception:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado")

    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado")

    try:
        return get_user_level_progress(db=db, user_id=uid)
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/cards/catalog",
    response_model=List[TradingCardResponse],
    status_code=status.HTTP_200_OK,
    summary="Lista cartas colecionáveis cadastradas no catálogo"
)
def get_cards_catalog(
    game_id: Optional[int] = Query(None, description="Filtrar cartas por ID do jogo"),
    db: Session = Depends(get_db),
):
    return get_catalog_cards(db=db, game_id=game_id)


@router.post(
    "/cards/grant",
    response_model=CardGrantResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Concede carta colecionável ao inventário do usuário"
)
def grant_card(
    payload: CardGrantRequest,
    db: Session = Depends(get_db),
):
    try:
        inv_item, card = grant_card_to_user(
            db=db,
            user_id=payload.user_id,
            game_id=payload.game_id,
            card_id=payload.card_id,
            is_foil=payload.is_foil,
            rarity=payload.rarity,
        )
        return CardGrantResponse(
            success=True,
            message="Carta concedida com sucesso ao inventário!",
            inventory_item=inv_item,
            card=card
        )
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/crafting/badge",
    response_model=CraftBadgeResponse,
    status_code=status.HTTP_200_OK,
    summary="Forja uma insígnia consumindo o set completo de cartas do jogo"
)
def craft_game_badge(
    payload: CraftBadgeRequest,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    uid = None
    if x_user_id:
        try:
            uid = int(x_user_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID de usuário inválido")
    elif token:
        try:
            payload_token = decode_access_token(token)
            uid = int(payload_token.get("sub"))
        except Exception:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado")

    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado")

    try:
        res = craft_badge(db=db, user_id=uid, game_id=payload.game_id, is_foil=payload.is_foil)
        return CraftBadgeResponse(
            success=True,
            message=f"Parabéns! Você forjou a insígnia '{res['badge'].name}' e ganhou +{res['xp_gained']} XP!",
            badge=res["badge"],
            badge_item=res["badge_item"],
            new_level=res["new_level"],
            new_total_xp=res["new_total_xp"],
            leveled_up=res["leveled_up"],
            xp_gained=res["xp_gained"],
            consumed_cards_count=res["consumed_cards_count"],
        )
    except LookupError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/badges/user/{user_id}",
    response_model=List[InventoryItemResponse],
    status_code=status.HTTP_200_OK,
    summary="Lista insígnias conquistadas por um usuário"
)
def get_user_badges_route(
    user_id: int,
    db: Session = Depends(get_db),
):
    return get_user_badges(db=db, user_id=user_id)


@router.get(
    "/badges/game/{game_id}",
    response_model=BadgeResponse,
    status_code=status.HTTP_200_OK,
    summary="Retorna os detalhes da insígnia correspondente a um jogo"
)
def get_game_badge_route(
    game_id: int,
    is_foil: bool = Query(False, description="Buscar versão Foil da insígnia"),
    db: Session = Depends(get_db),
):
    return get_or_create_game_badge(db=db, game_id=game_id, is_foil=is_foil)


from app.api.privacy import router as privacy_router
from app.api.public_profile import router as public_profile_router

router.include_router(privacy_router)
router.include_router(public_profile_router)

