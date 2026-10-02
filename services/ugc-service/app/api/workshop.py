import math
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.workshop import (
    WorkshopItemResponse,
    WorkshopPageResponse,
    WorkshopSubscribeResponse,
)
from app.services.workshop_service import WorkshopService

router = APIRouter(tags=["Workshop"])


def _parse_user_id(x_user_id: Optional[str]) -> Optional[int]:
    if not x_user_id:
        return None
    try:
        uid = int(x_user_id)
        return uid if uid > 0 else None
    except ValueError:
        return None


def _require_user_id(x_user_id: Optional[str]) -> int:
    uid = _parse_user_id(x_user_id)
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação obrigatória para esta operação do Workshop."
        )
    return uid


@router.post("/workshop/items", response_model=WorkshopItemResponse, status_code=status.HTTP_201_CREATED)
async def upload_workshop_item(
    file: UploadFile = File(..., description="Arquivo compactado do mod ou skin"),
    title: str = Form(..., description="Título do mod"),
    game_id: int = Form(..., description="ID do jogo compatível"),
    game_title: Optional[str] = Form(None, description="Nome do jogo"),
    category: str = Form("Mod", description="Categoria: Mod, Skin, Mapa, Tradução, Ferramenta"),
    tags: Optional[str] = Form("", description="Tags separadas por vírgula"),
    description: Optional[str] = Form(None, description="Descrição detalhada do mod"),
    version: Optional[str] = Form("1.0.0", description="Versão do mod"),
    preview_file: Optional[UploadFile] = File(None, description="Imagem de capa do mod"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_user_name: Optional[str] = Header(None, alias="X-User-Name"),
    db: Session = Depends(get_db),
):
    """
    Ticket O-02: Publicação/Upload de Mod ou Skin no Workshop da Comunidade MIST.
    """
    user_id = _require_user_id(x_user_id)
    author_name = x_user_name or f"player_{user_id}"

    item = await WorkshopService.upload_item(
        db=db,
        author_id=user_id,
        author_name=author_name,
        game_id=game_id,
        title=title,
        file=file,
        description=description,
        category=category,
        tags=tags or "",
        game_title=game_title,
        version=version or "1.0.0",
        preview_file=preview_file,
    )
    return item


@router.get("/workshop/items", response_model=WorkshopPageResponse)
def list_workshop_items(
    game_id: Optional[int] = Query(None, description="Filtrar por jogo"),
    author_id: Optional[int] = Query(None, description="Filtrar por criador"),
    category: Optional[str] = Query(None, description="Filtrar por categoria (Mod, Skin, etc.)"),
    tag: Optional[str] = Query(None, description="Filtrar por tag específica"),
    search: Optional[str] = Query(None, description="Busca textual por título, descrição ou tags"),
    sort_by: str = Query("popular", description="popular, downloads, recent ou rating"),
    subscribed_only: bool = Query(False, description="Apenas itens inscritos pelo usuário"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """
    Ticket O-03: Listagem e busca de itens do Workshop com filtros e ordenação por popularidade.
    """
    current_uid = _parse_user_id(x_user_id)
    skip = (page - 1) * size
    items, total = WorkshopService.list_items(
        db=db,
        game_id=game_id,
        author_id=author_id,
        category=category,
        tag=tag,
        search=search,
        sort_by=sort_by,
        current_user_id=current_uid,
        subscribed_only=subscribed_only,
        skip=skip,
        limit=size,
    )
    pages = max(1, math.ceil(total / size)) if total > 0 else 1
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": size,
        "page": page,
        "pages": pages,
    }


@router.get("/workshop/items/{item_id}", response_model=WorkshopItemResponse)
def get_workshop_item(
    item_id: int,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Obtém detalhes completos de uma criação do Workshop."""
    current_uid = _parse_user_id(x_user_id)
    return WorkshopService.get_item(db, item_id, current_uid)


@router.post("/workshop/items/{item_id}/subscribe", response_model=WorkshopSubscribeResponse)
def subscribe_workshop_item(
    item_id: int,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """
    Ticket O-04: Inscrever-se em um mod/skin (idempotente).
    """
    user_id = _require_user_id(x_user_id)
    return WorkshopService.subscribe_item(db, item_id, user_id)


@router.delete("/workshop/items/{item_id}/subscribe", response_model=WorkshopSubscribeResponse)
def unsubscribe_workshop_item(
    item_id: int,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """
    Ticket O-04: Cancelar inscrição de um mod/skin.
    """
    user_id = _require_user_id(x_user_id)
    return WorkshopService.unsubscribe_item(db, item_id, user_id)


@router.post("/workshop/items/{item_id}/download")
def register_mod_download(
    item_id: int,
    db: Session = Depends(get_db),
):
    """Incrementa a contagem de downloads e retorna a URL do arquivo para download."""
    return WorkshopService.increment_download(db, item_id)


@router.delete("/workshop/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workshop_item(
    item_id: int,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Exclui mod do Workshop (apenas o criador)."""
    user_id = _require_user_id(x_user_id)
    WorkshopService.delete_item(db, item_id, user_id)
    return None
