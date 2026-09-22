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
