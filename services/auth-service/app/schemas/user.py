from datetime import datetime
from typing import Optional
import re
from pydantic import BaseModel, EmailStr, Field, field_validator


COMMON_WEAK_PASSWORDS = {
    "password123!", "12345678@aa", "admin123!aa", "qwertyuiop!1a", "senha123!aa", "mudar123!aa"
}


class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)

    @field_validator("password")
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("A senha deve ter no mínimo 8 caracteres")
        if v.lower() in COMMON_WEAK_PASSWORDS:
            raise ValueError("Senha muito comum ou vulnerável. Escolha uma senha mais segura")
        if not re.search(r"[A-Z]", v):
            raise ValueError("A senha deve conter ao menos uma letra maiúscula")
        if not re.search(r"[a-z]", v):
            raise ValueError("A senha deve conter ao menos uma letra minúscula")
        if not re.search(r"\d", v):
            raise ValueError("A senha deve conter ao menos um número")
        if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?]", v):
            raise ValueError("A senha deve conter ao menos um símbolo/caractere especial")
        return v



class UserLoginRequest(BaseModel):
    username_or_email: str
    password: str


class UserPublicSearchResponse(BaseModel):
    id: int
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    avatar_frame_url: Optional[str] = None
    bio: Optional[str] = None
    level: int = 1
    games_count: int = 0
    friends_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}



class UserProfileResponse(BaseModel):
    id: int
    username: str
    email: str
    real_name: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = "Brasil"
    wallet_balance: float
    points_balance: int
    level: int
    total_xp: int = 100
    avatar_url: Optional[str] = None
    avatar_frame_url: Optional[str] = None
    profile_background_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}



class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfileResponse


class WalletDebitRequest(BaseModel):
    amount: float = Field(..., ge=0.0, description="Valor a ser debitado (maior ou igual a 0)")
    reason: Optional[str] = Field(None, description="Motivo ou identificador da transação")


class WalletCreditRequest(BaseModel):
    amount: float = Field(..., ge=0.0, description="Valor a ser creditado/estornado (maior ou igual a 0)")
    reason: Optional[str] = Field(None, description="Motivo ou identificador da transação/estorno")


class WalletOperationResponse(BaseModel):
    user_id: int
    previous_balance: float
    amount: float
    new_balance: float
    operation: str


class UserProfileUpdateRequest(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    display_name: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None


class WalletRechargeRequest(BaseModel):
    amount: float = Field(..., gt=0.0, le=5000.0, description="Valor da recarga de saldo (em R$)")
    payment_method: Optional[str] = Field("simulated", description="Método simulado de recarga")

