import math
import os
import uuid
from typing import List, Optional, Tuple
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.database import UPLOADS_DIR
from app.models.workshop import WorkshopItem, WorkshopSubscription

MAX_MOD_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
ALLOWED_MOD_EXTENSIONS = {".zip", ".rar", ".7z", ".pak", ".mod", ".tar", ".gz", ".json", ".png", ".jpg"}
ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


class WorkshopService:
    @staticmethod
    async def upload_item(
        db: Session,
        author_id: int,
        author_name: str,
        game_id: int,
        title: str,
        file: UploadFile,
        description: Optional[str] = None,
        category: str = "Mod",
        tags: str = "",
        game_title: Optional[str] = None,
        author_avatar: Optional[str] = None,
        version: str = "1.0.0",
        preview_file: Optional[UploadFile] = None,
    ) -> dict:
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Arquivo do mod ou skin obrigatório."
            )

        _, ext = os.path.splitext(file.filename.lower())
        if ext not in ALLOWED_MOD_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Extensão de arquivo não suportada ({ext}). Utilize arquivos compactados (.zip, .rar, .7z, .pak) ou dados de mod."
            )

        content = await file.read()
        file_size = len(content)
        if file_size > MAX_MOD_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="O arquivo excede o limite máximo permitido de 50 MB."
            )

        unique_filename = f"mod_{uuid.uuid4().hex[:16]}{ext}"
        destination_path = os.path.join(UPLOADS_DIR, unique_filename)
        with open(destination_path, "wb") as f:
            f.write(content)

        file_url = f"/api/ugc/uploads/{unique_filename}"

        preview_url = None
        if preview_file and preview_file.filename:
            _, prev_ext = os.path.splitext(preview_file.filename.lower())
            if prev_ext in ALLOWED_IMAGE_EXTENSIONS:
                prev_content = await preview_file.read()
                prev_filename = f"prev_{uuid.uuid4().hex[:16]}{prev_ext}"
                prev_path = os.path.join(UPLOADS_DIR, prev_filename)
                with open(prev_path, "wb") as f:
                    f.write(prev_content)
                preview_url = f"/api/ugc/uploads/{prev_filename}"

        clean_tags = [t.strip() for t in tags.split(",") if t.strip()] if tags else []

        item = WorkshopItem(
            game_id=game_id,
            game_title=game_title or f"Jogo #{game_id}",
            author_id=author_id,
            author_name=author_name or f"player_{author_id}",
            author_avatar=author_avatar,
            title=title.strip(),
            description=description.strip() if description else None,
            category=category or "Mod",
            tags=",".join(clean_tags),
            file_url=file_url,
            filename=unique_filename,
            file_size=file_size,
            preview_url=preview_url,
            version=version or "1.0.0",
            downloads_count=0,
            subscriptions_count=0,
            rating=5.0,
        )

        db.add(item)
        db.commit()
        db.refresh(item)

        return WorkshopService._format_item(item, is_subscribed=False)

    @staticmethod
    def list_items(
        db: Session,
        game_id: Optional[int] = None,
        author_id: Optional[int] = None,
        category: Optional[str] = None,
        tag: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = "popular",
        current_user_id: Optional[int] = None,
        subscribed_only: bool = False,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[dict], int]:
        query = db.query(WorkshopItem)

        if game_id:
            query = query.filter(WorkshopItem.game_id == game_id)
        if author_id:
            query = query.filter(WorkshopItem.author_id == author_id)
        if category and category.lower() != "todos":
            query = query.filter(WorkshopItem.category.ilike(category))
        if tag:
            query = query.filter(WorkshopItem.tags.ilike(f"%{tag}%"))
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    WorkshopItem.title.ilike(search_pattern),
                    WorkshopItem.description.ilike(search_pattern),
                    WorkshopItem.tags.ilike(search_pattern),
                    WorkshopItem.game_title.ilike(search_pattern),
                )
            )

        if subscribed_only and current_user_id:
            query = query.join(
                WorkshopSubscription,
                (WorkshopSubscription.item_id == WorkshopItem.id) & (WorkshopSubscription.user_id == current_user_id)
            )

        if sort_by == "recent":
            query = query.order_by(WorkshopItem.created_at.desc())
        elif sort_by == "downloads":
            query = query.order_by(WorkshopItem.downloads_count.desc(), WorkshopItem.created_at.desc())
        elif sort_by == "rating":
            query = query.order_by(WorkshopItem.rating.desc(), WorkshopItem.subscriptions_count.desc())
        else:  # popular (padrão)
            query = query.order_by(WorkshopItem.subscriptions_count.desc(), WorkshopItem.downloads_count.desc())

        total = query.count()
        raw_items = query.offset(skip).limit(limit).all()

        subscribed_item_ids = set()
        if current_user_id and raw_items:
            item_ids = [item.id for item in raw_items]
            subs = (
                db.query(WorkshopSubscription.item_id)
                .filter(
                    WorkshopSubscription.user_id == current_user_id,
                    WorkshopSubscription.item_id.in_(item_ids)
                )
                .all()
            )
            subscribed_item_ids = {s[0] for s in subs}

        formatted = [
            WorkshopService._format_item(item, is_subscribed=(item.id in subscribed_item_ids))
            for item in raw_items
        ]
        return formatted, total

    @staticmethod
    def get_item(db: Session, item_id: int, current_user_id: Optional[int] = None) -> dict:
        item = db.query(WorkshopItem).filter(WorkshopItem.id == item_id).first()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item do Workshop não encontrado."
            )

        is_sub = False
        if current_user_id:
            is_sub = (
                db.query(WorkshopSubscription)
                .filter(
                    WorkshopSubscription.item_id == item.id,
                    WorkshopSubscription.user_id == current_user_id
                )
                .first()
                is not None
            )

        return WorkshopService._format_item(item, is_subscribed=is_sub)

    @staticmethod
    def subscribe_item(db: Session, item_id: int, user_id: int) -> dict:
        item = db.query(WorkshopItem).filter(WorkshopItem.id == item_id).first()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item do Workshop não encontrado."
            )

        existing = (
            db.query(WorkshopSubscription)
            .filter(
                WorkshopSubscription.item_id == item_id,
                WorkshopSubscription.user_id == user_id
            )
            .first()
        )

        if not existing:
            sub = WorkshopSubscription(item_id=item_id, user_id=user_id)
            db.add(sub)
            item.subscriptions_count = (item.subscriptions_count or 0) + 1
            db.commit()
            db.refresh(item)

        return {
            "item_id": item.id,
            "subscribed": True,
            "subscriptions_count": item.subscriptions_count,
        }

    @staticmethod
    def unsubscribe_item(db: Session, item_id: int, user_id: int) -> dict:
        item = db.query(WorkshopItem).filter(WorkshopItem.id == item_id).first()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item do Workshop não encontrado."
            )

        existing = (
            db.query(WorkshopSubscription)
            .filter(
                WorkshopSubscription.item_id == item_id,
                WorkshopSubscription.user_id == user_id
            )
            .first()
        )

        if existing:
            db.delete(existing)
            item.subscriptions_count = max(0, (item.subscriptions_count or 1) - 1)
            db.commit()
            db.refresh(item)

        return {
            "item_id": item.id,
            "subscribed": False,
            "subscriptions_count": item.subscriptions_count,
        }

    @staticmethod
    def increment_download(db: Session, item_id: int) -> dict:
        item = db.query(WorkshopItem).filter(WorkshopItem.id == item_id).first()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item do Workshop não encontrado."
            )

        item.downloads_count = (item.downloads_count or 0) + 1
        db.commit()
        db.refresh(item)
        return {
            "item_id": item.id,
            "downloads_count": item.downloads_count,
            "file_url": item.file_url,
        }

    @staticmethod
    def delete_item(db: Session, item_id: int, user_id: int) -> None:
        item = db.query(WorkshopItem).filter(WorkshopItem.id == item_id).first()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item do Workshop não encontrado."
            )

        if item.author_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para excluir este item do Workshop."
            )

        # Remove arquivos associados se existirem
        if item.filename:
            fpath = os.path.join(UPLOADS_DIR, item.filename)
            if os.path.isfile(fpath):
                try:
                    os.remove(fpath)
                except OSError:
                    pass

        if item.preview_url and item.preview_url.startswith("/api/ugc/uploads/"):
            prev_name = os.path.basename(item.preview_url)
            prev_path = os.path.join(UPLOADS_DIR, prev_name)
            if os.path.isfile(prev_path):
                try:
                    os.remove(prev_path)
                except OSError:
                    pass

        db.delete(item)
        db.commit()

    @staticmethod
    def _format_item(item: WorkshopItem, is_subscribed: bool = False) -> dict:
        tags_list = []
        if item.tags:
            item_tags_str = item.tags.strip()
            if item_tags_str.startswith("[") and item_tags_str.endswith("]"):
                try:
                    loaded = json.loads(item_tags_str)
                    if isinstance(loaded, list):
                        tags_list = [str(t).strip() for t in loaded if str(t).strip()]
                except Exception:
                    tags_list = [t.strip() for t in item.tags.split(",") if t.strip()]
            else:
                tags_list = [t.strip() for t in item.tags.split(",") if t.strip()]
        return {
            "id": item.id,
            "game_id": item.game_id,
            "game_title": item.game_title,
            "author_id": item.author_id,
            "author_name": item.author_name,
            "author_avatar": item.author_avatar,
            "title": item.title,
            "description": item.description,
            "category": item.category,
            "tags": tags_list,
            "file_url": item.file_url,
            "filename": item.filename,
            "file_size": item.file_size,
            "preview_url": item.preview_url,
            "version": item.version,
            "downloads_count": item.downloads_count,
            "subscriptions_count": item.subscriptions_count,
            "rating": item.rating,
            "is_subscribed": is_subscribed,
            "created_at": item.created_at,
            "updated_at": item.updated_at,
        }
