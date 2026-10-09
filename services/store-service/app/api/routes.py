import json
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.system_review import SystemReview
from app.schemas.game import GameListItemResponse, GameDetailResponse
from app.schemas.review import ReviewCreate, ReviewResponse, ReviewHelpfulResponse
from app.schemas.system_review import SystemReviewCreate, SystemReviewResponse
from app.services.review_service import ReviewService
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
    summary = ReviewService.get_summary(db=db, game_id=game_id)
    return GameDetailResponse.model_validate(game).model_copy(update=summary.model_dump())


def _require_user_id(x_user_id: Optional[str]) -> int:
    if not x_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado")
    try:
        user_id = int(x_user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Identificador de usuário inválido.")
    if user_id <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Identificador de usuário inválido.")
    return user_id


def _review_response(review, helpful_count: int) -> ReviewResponse:
    return ReviewResponse.model_validate(review).model_copy(update={"helpful_count": helpful_count})


@router.post("/games/{game_id}/reviews", response_model=ReviewResponse)
async def create_or_update_review(
    game_id: int,
    payload: ReviewCreate,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    """
    Cria (201) ou atualiza (200) a avaliação do usuário para o jogo.
    Exige posse do jogo na biblioteca; as horas jogadas são gravadas em `playtime_at_review`.
    """
    user_id = _require_user_id(x_user_id)
    if not StoreService.get_game_by_id(db=db, game_id=game_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Jogo não encontrado")

    playtime_minutes = await ReviewService.fetch_playtime_minutes(user_id=user_id, game_id=game_id)
    review, created = ReviewService.upsert_review(
        db=db, user_id=user_id, game_id=game_id, payload=payload, playtime_minutes=playtime_minutes
    )
    body = _review_response(review, ReviewService.helpful_counts(db, [review.id]).get(review.id, 0))
    return JSONResponse(
        status_code=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        content=json.loads(body.model_dump_json()),
    )


@router.get("/games/{game_id}/reviews", response_model=List[ReviewResponse], status_code=status.HTTP_200_OK)
def list_game_reviews(
    game_id: int,
    sort: str = Query("recent", pattern="^(recent|helpful)$", description="Ordenação: recent ou helpful"),
    is_recommended: Optional[bool] = Query(None, description="Filtra por avaliações positivas (true) ou negativas (false)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Lista as avaliações da comunidade para o jogo."""
    if not StoreService.get_game_by_id(db=db, game_id=game_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Jogo não encontrado")
    rows = ReviewService.list_reviews(
        db=db, game_id=game_id, sort=sort, is_recommended=is_recommended, skip=skip, limit=limit
    )
    return [_review_response(review, helpful_count) for review, helpful_count in rows]


@router.post("/reviews/{review_id}/helpful", response_model=ReviewHelpfulResponse)
def mark_review_helpful(
    review_id: int,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    """Marca uma avaliação como útil (idempotente: um voto por usuário)."""
    user_id = _require_user_id(x_user_id)
    helpful_count, created = ReviewService.add_helpful_vote(db=db, review_id=review_id, user_id=user_id)
    return JSONResponse(
        status_code=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        content={"review_id": review_id, "helpful_count": helpful_count, "created": created},
    )


@router.get("/games/{game_id}/download", status_code=status.HTTP_200_OK)
@router.get("/store/games/{game_id}/download", status_code=status.HTTP_200_OK)
def download_game_package(
    game_id: int,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_user_token: Optional[str] = Header(None, alias="X-User-Token"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """
    Gera dinamicamente e retorna um arquivo .zip contendo:
    - game.py (código do jogo Python)
    - mist_sdk.py (SDK MIST)
    - session.json (credenciais de sessão pré-configuradas)
    - jogar.bat (Launcher nativo para Windows)
    - jogar.sh (Launcher nativo para Linux e macOS)
    - LEIAME.txt (Instruções completas de execução)
    """
    from fastapi.responses import StreamingResponse

    # Extrai o token de autenticação a partir de X-User-Token ou Authorization Bearer
    token = x_user_token
    if not token and authorization:
        if authorization.lower().startswith("bearer "):
            token = authorization[7:].strip()
        else:
            token = authorization.strip()

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
        user_token=token
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


@router.get("/recommendations", status_code=status.HTTP_200_OK)
@router.get("/store/recommendations", status_code=status.HTTP_200_OK)
async def get_curated_recommendations(
    limit: int = Query(4, ge=1, le=20, description="Limite de jogos recomendados"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    """
    MIST AI Curator (G-02): Retorna jogos recomendados para o usuário autenticado
    utilizando histórico de biblioteca e tags de favoritos na lista de desejos.
    """
    user_id_int: Optional[int] = None
    if x_user_id:
        try:
            user_id_int = int(x_user_id)
        except ValueError:
            pass

    recommendations = await StoreService.get_curated_recommendations(
        db=db,
        user_id=user_id_int,
        limit=limit
    )
    return recommendations


@router.get("/trends/top-sellers", status_code=status.HTTP_200_OK)
@router.get("/store/trends/top-sellers", status_code=status.HTTP_200_OK)
def get_top_sellers(
    limit: int = Query(10, ge=1, le=50, description="Limite de jogos mais vendidos"),
    days: Optional[int] = Query(None, ge=1, description="Janela de dias para agregação"),
    db: Session = Depends(get_db)
):
    """
    Ticket S-01: Retorna o ranking de jogos mais vendidos a partir de compras finalizadas.
    """
    from app.services.ai_trends import calculate_top_sellers
    return calculate_top_sellers(db=db, limit=limit, days=days)


@router.get("/trends/trending", status_code=status.HTTP_200_OK)
@router.get("/store/trends/trending", status_code=status.HTTP_200_OK)
def get_trending_games(
    limit: int = Query(10, ge=1, le=50, description="Limite de jogos em alta"),
    days: int = Query(7, ge=1, le=90, description="Janela de dias para análise de tendência"),
    db: Session = Depends(get_db)
):
    """
    Ticket S-01: Retorna os jogos 'Em Alta' calculados pelo algoritmo de tendência ponderada.
    """
    from app.services.ai_trends import calculate_trending_games
    return calculate_trending_games(db=db, limit=limit, days=days)


@router.get("/wishlist/alerts", status_code=status.HTTP_200_OK)
@router.get("/store/wishlist/alerts", status_code=status.HTTP_200_OK)
def get_wishlist_alerts(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    """
    Ticket S-03: Notificador proativo de descontos em itens favoritados na Wishlist.
    """
    user_id = _require_user_id(x_user_id)
    from app.services.wishlist_ai import get_wishlist_discount_alerts
    return get_wishlist_discount_alerts(db=db, user_id=user_id)


@router.get("/system-reviews", response_model=List[SystemReviewResponse], status_code=status.HTTP_200_OK)
@router.get("/store/system-reviews", response_model=List[SystemReviewResponse], status_code=status.HTTP_200_OK)
def list_system_reviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Lista avaliações e feedbacks sobre a plataforma MIST em ordem cronológica reversa.
    """
    reviews = (
        db.query(SystemReview)
        .order_by(SystemReview.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return reviews


@router.post("/system-reviews", response_model=SystemReviewResponse, status_code=status.HTTP_201_CREATED)
@router.post("/store/system-reviews", response_model=SystemReviewResponse, status_code=status.HTTP_201_CREATED)
def create_system_review(
    payload: SystemReviewCreate,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_user_username: Optional[str] = Header(None, alias="X-User-Username"),
    db: Session = Depends(get_db)
):
    """
    Registra uma avaliação ou feedback sobre a plataforma MIST deixado por um usuário autenticado.
    Registra data, hora, nome do usuário logado e valida o limite de 500 caracteres.
    """
    user_id = _require_user_id(x_user_id)
    username = x_user_username or f"usuario_{user_id}"

    review = SystemReview(
        user_id=user_id,
        username=username,
        content=payload.content.strip(),
        is_recommended=payload.is_recommended,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


