import os
import uuid
import shutil
from typing import List, Optional, Tuple
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.db.database import UPLOADS_DIR
from app.models.screenshot import Screenshot, ScreenshotLike

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


class ScreenshotService:
    @staticmethod
    async def upload_screenshot(
        db: Session,
        user_id: int,
        game_id: int,
        file: UploadFile,
        caption: Optional[str] = None,
        title: Optional[str] = None,
        username: Optional[str] = None,
        game_title: Optional[str] = None,
    ) -> Screenshot:
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nome de arquivo inválido."
            )

        _, ext = os.path.splitext(file.filename.lower())
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Formato de imagem não suportado ({ext}). Utilize PNG, JPG, JPEG ou WEBP."
            )

        # Lê conteúdo para validar tamanho
        content = await file.read()
        file_size = len(content)
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Arquivo excede o limite máximo permitido de 10 MB."
            )

        # Gera nome único seguro
        unique_filename = f"ss_{uuid.uuid4().hex[:16]}{ext}"
        destination_path = os.path.join(UPLOADS_DIR, unique_filename)

        with open(destination_path, "wb") as f:
            f.write(content)

        file_url = f"/api/ugc/uploads/{unique_filename}"

        screenshot = Screenshot(
            user_id=user_id,
            username=username or f"player_{user_id}",
            game_id=game_id,
            game_title=game_title or f"Jogo #{game_id}",
            title=title or file.filename,
            caption=caption or "",
            filename=unique_filename,
            file_url=file_url,
            file_size=file_size,
            width=1920,
            height=1080,
            likes_count=0,
        )

        db.add(screenshot)
        db.commit()
        db.refresh(screenshot)
        return screenshot

    @staticmethod
    def list_screenshots(
        db: Session,
        game_id: Optional[int] = None,
        user_id: Optional[int] = None,
        current_user_id: Optional[int] = None,
        sort_by: str = "recent",
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[dict], int]:
        query = db.query(Screenshot)

        if game_id:
            query = query.filter(Screenshot.game_id == game_id)
        if user_id:
            query = query.filter(Screenshot.user_id == user_id)

        total = query.count()

        if sort_by == "popular":
            query = query.order_by(Screenshot.likes_count.desc(), Screenshot.created_at.desc())
        else:
            query = query.order_by(Screenshot.created_at.desc())

        items = query.offset(skip).limit(limit).all()

        # Determina quais capturas foram curtidas pelo usuário atual
        liked_screenshot_ids = set()
        if current_user_id and items:
            screenshot_ids = [s.id for s in items]
            liked_rows = (
                db.query(ScreenshotLike.screenshot_id)
                .filter(
                    ScreenshotLike.user_id == current_user_id,
                    ScreenshotLike.screenshot_id.in_(screenshot_ids),
                )
                .all()
            )
            liked_screenshot_ids = {r[0] for r in liked_rows}

        results = []
        for s in items:
            data = {
                "id": s.id,
                "user_id": s.user_id,
                "username": s.username,
                "game_id": s.game_id,
                "game_title": s.game_title,
                "title": s.title,
                "caption": s.caption,
                "filename": s.filename,
                "file_url": s.file_url,
                "file_size": s.file_size,
                "width": s.width,
                "height": s.height,
                "likes_count": s.likes_count,
                "liked_by_me": s.id in liked_screenshot_ids,
                "created_at": s.created_at,
            }
            results.append(data)

        return results, total

    @staticmethod
    def get_screenshot(db: Session, screenshot_id: int, current_user_id: Optional[int] = None) -> dict:
        s = db.query(Screenshot).filter(Screenshot.id == screenshot_id).first()
        if not s:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Captura de tela não encontrada.")

        liked_by_me = False
        if current_user_id:
            liked_by_me = (
                db.query(ScreenshotLike)
                .filter(ScreenshotLike.screenshot_id == screenshot_id, ScreenshotLike.user_id == current_user_id)
                .first()
                is not None
            )

        return {
            "id": s.id,
            "user_id": s.user_id,
            "username": s.username,
            "game_id": s.game_id,
            "game_title": s.game_title,
            "title": s.title,
            "caption": s.caption,
            "filename": s.filename,
            "file_url": s.file_url,
            "file_size": s.file_size,
            "width": s.width,
            "height": s.height,
            "likes_count": s.likes_count,
            "liked_by_me": liked_by_me,
            "created_at": s.created_at,
        }

    @staticmethod
    def like_screenshot(db: Session, screenshot_id: int, user_id: int) -> dict:
        screenshot = db.query(Screenshot).filter(Screenshot.id == screenshot_id).first()
        if not screenshot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Captura de tela não encontrada.")

        existing = (
            db.query(ScreenshotLike)
            .filter(ScreenshotLike.screenshot_id == screenshot_id, ScreenshotLike.user_id == user_id)
            .first()
        )

        if not existing:
            like = ScreenshotLike(screenshot_id=screenshot_id, user_id=user_id)
            db.add(like)
            screenshot.likes_count += 1
            db.commit()
            db.refresh(screenshot)

        return {
            "screenshot_id": screenshot_id,
            "likes_count": screenshot.likes_count,
            "liked": True,
        }

    @staticmethod
    def unlike_screenshot(db: Session, screenshot_id: int, user_id: int) -> dict:
        screenshot = db.query(Screenshot).filter(Screenshot.id == screenshot_id).first()
        if not screenshot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Captura de tela não encontrada.")

        existing = (
            db.query(ScreenshotLike)
            .filter(ScreenshotLike.screenshot_id == screenshot_id, ScreenshotLike.user_id == user_id)
            .first()
        )

        if existing:
            db.delete(existing)
            screenshot.likes_count = max(0, screenshot.likes_count - 1)
            db.commit()
            db.refresh(screenshot)

        return {
            "screenshot_id": screenshot_id,
            "likes_count": screenshot.likes_count,
            "liked": False,
        }

    @staticmethod
    def delete_screenshot(db: Session, screenshot_id: int, user_id: int) -> bool:
        screenshot = db.query(Screenshot).filter(Screenshot.id == screenshot_id).first()
        if not screenshot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Captura de tela não encontrada.")

        if screenshot.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para excluir esta captura de tela."
            )

        file_path = os.path.join(UPLOADS_DIR, screenshot.filename)
        if os.path.isfile(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

        db.delete(screenshot)
        db.commit()
        return True
