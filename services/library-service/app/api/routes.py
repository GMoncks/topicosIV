import os
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.library_item import GrantRequest, GrantResponse, LibraryItemResponse
from app.services.library_service import LibraryService

router = APIRouter(tags=["Library"])

STORE_SERVICE_URL = os.getenv("STORE_SERVICE_URL", "http://localhost:8002")


@router.get("/health", status_code=status.HTTP_200_OK)
@router.get("/library/health", status_code=status.HTTP_200_OK)
def health_check():
    return {"status": "healthy", "service": "library-service"}


@router.post(
    "/library/grant",
    response_model=GrantResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Concede a licença de um jogo a um usuário"
)
def grant_game(
    payload: GrantRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Endpoint interno utilizado para registrar a posse de um jogo após checkout ou distribuição direta.
    É idempotente: se o usuário já possuir o jogo, retorna 200 OK com os dados existentes.
    """
    item, created = LibraryService.grant_game(
        db=db,
        user_id=payload.user_id,
        game_id=payload.game_id
    )

    if not created:
        response.status_code = status.HTTP_200_OK

    return GrantResponse(
        id=item.id,
        user_id=item.user_id,
        game_id=item.game_id,
        acquired_at=item.acquired_at,
        created=created
    )


@router.get(
    "/library/users/{user_id}/has-game/{game_id}",
    status_code=status.HTTP_200_OK,
    summary="Verifica se o usuário já possui a licença de um determinado jogo"
)
@router.get(
    "/users/{user_id}/has-game/{game_id}",
    status_code=status.HTTP_200_OK,
    summary="Alias para verificação de posse de jogo"
)
def check_user_has_game(
    user_id: int,
    game_id: int,
    db: Session = Depends(get_db)
):
    owned = LibraryService.has_game(db=db, user_id=user_id, game_id=game_id)
    return {"user_id": user_id, "game_id": game_id, "owned": owned}


@router.get(
    "/library/my-games",
    response_model=List[LibraryItemResponse],
    status_code=status.HTTP_200_OK,
    summary="Lista os jogos adquiridos pelo usuário autenticado"
)
async def get_my_games(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    """
    Retorna os jogos presentes na biblioteca do usuário solicitante (identificado via header X-User-Id).
    Enriquece os itens com metadados do jogo consultados no store-service.
    """
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identificação do usuário ausente. É necessário autenticar-se para acessar a biblioteca."
        )

    try:
        user_id_int = int(x_user_id)
        if user_id_int <= 0:
            raise ValueError()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identificador de usuário inválido."
        )

    items = LibraryService.get_user_games(db=db, user_id=user_id_int)
    enriched = await LibraryService.enrich_library_items(
        items=items,
        store_service_url=STORE_SERVICE_URL
    )
    return enriched


from app.schemas.achievement import AchievementResponse
from pydantic import BaseModel

class UnlockAchievementPayload(BaseModel):
    user_id: int
    game_id: int
    achievement_id: str
    session_token: Optional[str] = None


@router.get(
    "/library/games/{game_id}/achievements",
    response_model=List[AchievementResponse],
    status_code=status.HTTP_200_OK,
    summary="Lista as conquistas de um jogo e o status de desbloqueio para o usuário autenticado"
)
def get_game_achievements(
    game_id: int,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    """
    Retorna todas as conquistas do jogo informado.
    Se o header X-User-Id for fornecido, cruza os dados com a tabela de conquistas desbloqueadas.
    """
    user_id_int: Optional[int] = None
    if x_user_id:
        try:
            user_id_int = int(x_user_id)
        except ValueError:
            pass

    return LibraryService.get_game_achievements(
        db=db,
        game_id=game_id,
        user_id=user_id_int
    )


@router.post(
    "/achievements/unlock",
    status_code=status.HTTP_200_OK,
    summary="Desbloqueia uma conquista para um usuário via SDK ou chamada direta"
)
@router.post(
    "/library/achievements/unlock",
    status_code=status.HTTP_200_OK,
    summary="Desbloqueia uma conquista para um usuário via Gateway"
)
def unlock_achievement(
    payload: UnlockAchievementPayload,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    user_id = payload.user_id
    if x_user_id:
        try:
            user_id = int(x_user_id)
        except ValueError:
            pass

    unlock, created = LibraryService.unlock_achievement(
        db=db,
        user_id=user_id,
        game_id=payload.game_id,
        achievement_id=payload.achievement_id
    )

    return {
        "status": "unlocked" if created else "already_unlocked",
        "achievement_id": unlock.achievement_id,
        "unlocked_at": unlock.unlocked_at.isoformat() if unlock.unlocked_at else None,
        "created": created
    }
