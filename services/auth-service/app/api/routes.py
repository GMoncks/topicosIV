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
    WalletDebitRequest,
    WalletCreditRequest,
    WalletOperationResponse,
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
    credit_points,
    get_points_shop_items,
    purchase_points_item,
    equip_cosmetic,
    get_user_inventory,
)


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
    summary="Retorna os itens cosméticos adquiridos no inventário do usuário"
)
def get_inventory(
    item_type: Optional[str] = None,
    db: Session = Depends(get_db),
    user_id: int = Depends(resolve_authenticated_user_id)
):
    items = get_user_inventory(db=db, user_id=user_id, item_type=item_type)
    return InventoryListResponse(items=items, total=len(items))

