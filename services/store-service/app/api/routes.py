from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.game import GameListItemResponse, GameDetailResponse
from app.services.store_service import StoreService

router = APIRouter(tags=["Store"])


@router.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    return {"status": "healthy", "service": "store-service"}


@router.get("/games", response_model=List[GameListItemResponse], status_code=status.HTTP_200_OK)
def list_games(
    category: Optional[str] = Query(None, description="Filtrar por categoria (ex: RPG, Ação, Terror)"),
    tag: Optional[str] = Query(None, description="Filtrar por tag específica (ex: Mundo Aberto, Espaço)"),
    min_price: Optional[float] = Query(None, ge=0.0, description="Preço mínimo em R$"),
    max_price: Optional[float] = Query(None, ge=0.0, description="Preço máximo em R$"),
    search: Optional[str] = Query(None, description="Busca textual por título, descrição ou publisher"),
    q: Optional[str] = Query(None, description="Alias alternativo para busca textual"),
    sort_by: Optional[str] = Query("release_date", description="Critério de ordenação: price, release_date, review_score, title"),
    order: Optional[str] = Query("desc", description="Direção da ordenação: asc ou desc"),
    skip: int = Query(0, ge=0, description="Número de registros a pular"),
    limit: int = Query(50, ge=1, le=100, description="Limite de registros retornados"),
    db: Session = Depends(get_db)
):
    """
    Lista o catálogo de jogos com filtros combinados por categoria, tag, preço, busca textual e ordenação.
    """
    effective_search = search if search is not None else q
    games = StoreService.list_games(
        db=db,
        category=category,
        tag=tag,
        min_price=min_price,
        max_price=max_price,
        search=effective_search,
        sort_by=sort_by,
        order=order,
        skip=skip,
        limit=limit
    )
    return games


@router.get("/games/{game_id}", response_model=GameDetailResponse, status_code=status.HTTP_200_OK)
def get_game_details(
    game_id: int,
    db: Session = Depends(get_db)
):
    """
    Retorna os detalhes completos de um jogo (incluindo sinopse e capturas de tela) a partir de seu ID.
    """
    game = StoreService.get_game_by_id(db=db, game_id=game_id)
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jogo não encontrado"
        )
    return game


@router.get("/games/{game_id}/download", status_code=status.HTTP_200_OK)
@router.get("/store/games/{game_id}/download", status_code=status.HTTP_200_OK)
def download_game_package(
    game_id: int,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_user_token: Optional[str] = Header(None, alias="X-User-Token"),
    db: Session = Depends(get_db)
):
    """
    Gera dinamicamente e retorna um arquivo .zip contendo:
    - game.py (código do jogo Python)
    - mist_sdk.py (SDK MIST)
    - session.json (credenciais de sessão pré-configuradas)
    """
    from fastapi.responses import StreamingResponse

    # Se x_user_id for fornecido, converte para int; caso contrário, usa ID padrão sandbox (1)
    user_id = 1
    if x_user_id:
        try:
            user_id = int(x_user_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Header X-User-Id inválido."
            )

    zip_buffer, filename = StoreService.build_game_package(
        db=db,
        game_id=game_id,
        user_id=user_id,
        user_token=x_user_token
    )

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        }
    )


from app.schemas.wishlist import WishlistAddResponse, WishlistItemResponse
from fastapi.responses import JSONResponse

@router.post("/wishlist/{game_id}", response_model=WishlistAddResponse)
def add_to_wishlist(
    game_id: int,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    if not x_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado")
    
    user_id = int(x_user_id)
    game = StoreService.get_game_by_id(db, game_id)
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Jogo não encontrado")
    
    wishlist_item, created = StoreService.add_to_wishlist(db, user_id, game_id)
    return JSONResponse(
        status_code=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        content={
            "id": wishlist_item.id,
            "user_id": wishlist_item.user_id,
            "game_id": wishlist_item.game_id,
            "added_at": wishlist_item.added_at.isoformat() if wishlist_item.added_at else None,
            "created": created
        }
    )

@router.delete("/wishlist/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_wishlist(
    game_id: int,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    if not x_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado")
    
    user_id = int(x_user_id)
    success = StoreService.remove_from_wishlist(db, user_id, game_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item não encontrado na wishlist")
    
    return None

@router.get("/wishlist", response_model=List[WishlistItemResponse])
def get_wishlist(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    if not x_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado")
    
    user_id = int(x_user_id)
    items = StoreService.get_user_wishlist(db, user_id)
    
    response_items = []
    for item in items:
        game = StoreService.get_game_by_id(db, item.game_id)
        response_items.append({
            "id": item.id,
            "user_id": item.user_id,
            "game_id": item.game_id,
            "added_at": item.added_at,
            "game": game
        })
        
    return response_items


from app.schemas.checkout import CheckoutRequest, CheckoutResponse


@router.post("/checkout", response_model=CheckoutResponse, status_code=status.HTTP_201_CREATED)
@router.post("/store/checkout", response_model=CheckoutResponse, status_code=status.HTTP_201_CREATED)
async def checkout(
    payload: CheckoutRequest,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    """
    Processa a compra de 1 jogo (unitário) ou N jogos (carrinho) de forma atômica e segura.
    Executa a verificação prévia de posse, débito atômico na carteira e compensação Saga.
    """
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação necessária para realizar compras."
        )

    try:
        user_id = int(x_user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Identificador de usuário inválido."
        )

    game_ids = []
    if payload.game_ids:
        game_ids.extend(payload.game_ids)
    elif payload.game_id is not None:
        game_ids.append(payload.game_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe ao menos um jogo para realizar o checkout."
        )

    result = await StoreService.execute_checkout(
        db=db,
        user_id=user_id,
        game_ids=game_ids,
        idempotency_key=payload.idempotency_key
    )
    return result
