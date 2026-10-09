import os
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session


from app.db.database import UPLOADS_DIR, get_db
from app.schemas.screenshot import (
    ScreenshotLikeResponse,
    ScreenshotPageResponse,
    ScreenshotResponse,
)
from app.services.screenshot_service import ScreenshotService

router = APIRouter(tags=["Screenshots"])


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
            detail="Autenticação obrigatória para esta operação."
        )
    return uid


@router.post("/screenshots/upload", response_model=ScreenshotResponse, status_code=status.HTTP_201_CREATED)
async def upload_screenshot(
    file: UploadFile = File(...),
    game_id: int = Form(...),
    caption: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    game_title: Optional[str] = Form(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_user_name: Optional[str] = Header(None, alias="X-User-Name"),
    db: Session = Depends(get_db),
):
    """
    Ticket N-01: Upload de capturas de tela (multipart/form-data)
    Armazena o arquivo no volume e registra metadados no SQLite.
    """
    user_id = _require_user_id(x_user_id)
    screenshot = await ScreenshotService.upload_screenshot(
        db=db,
        user_id=user_id,
        game_id=game_id,
        file=file,
        caption=caption,
        title=title,
        username=x_user_name,
        game_title=game_title,
    )
    return screenshot


@router.get("/screenshots", response_model=ScreenshotPageResponse)
def list_screenshots(
    game_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    sort_by: str = Query("recent", description="recent ou popular"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """
    Ticket N-03: Listagem de capturas com filtros e ordenação por data ou popularidade.
    """
    current_uid = _parse_user_id(x_user_id)
    items, total = ScreenshotService.list_screenshots(
        db=db,
        game_id=game_id,
        user_id=user_id,
        current_user_id=current_uid,
        sort_by=sort_by,
        skip=skip,
        limit=limit,
    )
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/screenshots/{screenshot_id}", response_model=ScreenshotResponse)
def get_screenshot(
    screenshot_id: int,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Obtém detalhes de uma captura de tela específica."""
    current_uid = _parse_user_id(x_user_id)
    return ScreenshotService.get_screenshot(db, screenshot_id, current_uid)


@router.post("/screenshots/{screenshot_id}/like", response_model=ScreenshotLikeResponse)
def like_screenshot(
    screenshot_id: int,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """
    Ticket N-04: Curtir captura de tela (idempotente).
    """
    user_id = _require_user_id(x_user_id)
    return ScreenshotService.like_screenshot(db, screenshot_id, user_id)


@router.delete("/screenshots/{screenshot_id}/like", response_model=ScreenshotLikeResponse)
def unlike_screenshot(
    screenshot_id: int,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """
    Ticket N-04: Descurtir captura de tela.
    """
    user_id = _require_user_id(x_user_id)
    return ScreenshotService.unlike_screenshot(db, screenshot_id, user_id)


@router.delete("/screenshots/{screenshot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_screenshot(
    screenshot_id: int,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Exclui captura de tela (apenas o autor)."""
    user_id = _require_user_id(x_user_id)
    ScreenshotService.delete_screenshot(db, screenshot_id, user_id)
    return None


@router.get("/uploads/{filename}")
def serve_upload(filename: str):
    """Serve arquivos de imagem estáticos armazenados no volume com defesa em profundidade (F12)."""
    safe_filename = os.path.basename(filename)
    base = Path(UPLOADS_DIR).resolve()
    target = (base / safe_filename).resolve()
    if not target.is_file() or base not in target.parents:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo não encontrado.")
    return FileResponse(str(target))

