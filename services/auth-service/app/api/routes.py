from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
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
from app.services.auth_service import (
    get_user_by_username,
    get_user_by_email,
    get_user_by_id,
    create_user,
    authenticate_user,
    create_access_token,
    decode_access_token,
    debit_wallet,
    credit_wallet,
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
