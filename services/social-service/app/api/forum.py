from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.group import Group, GroupMember
from app.models.forum import ForumPost, ForumReply
from app.schemas.forum import (
    ForumPostCreate,
    ForumPostUpdate,
    ForumPostResponse,
    ForumPostDetailResponse,
    ForumReplyCreate,
    ForumReplyResponse,
)

router = APIRouter(tags=["forum"])


def get_current_user_id(x_user_id: Optional[str] = Header(None)) -> Optional[int]:
    if not x_user_id:
        return None
    try:
        return int(x_user_id)
    except ValueError:
        return None


def require_user_id(x_user_id: Optional[str] = Header(None)) -> int:
    uid = get_current_user_id(x_user_id)
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Header X-User-Id ausente ou inválido"
        )
    return uid


@router.get("/groups/{group_id}/posts", response_model=List[ForumPostResponse])
def list_group_posts(group_id: int, db: Session = Depends(get_db)):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")

    posts = db.query(ForumPost).filter(ForumPost.group_id == group_id).order_by(
        ForumPost.is_pinned.desc(),
        ForumPost.updated_at.desc(),
        ForumPost.id.desc()
    ).all()
    return posts


@router.post("/groups/{group_id}/posts", response_model=ForumPostResponse, status_code=status.HTTP_201_CREATED)
def create_group_post(
    group_id: int,
    post_in: ForumPostCreate,
    user_id: int = Depends(require_user_id),
    db: Session = Depends(get_db)
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")

    # Verifica se o usuário é membro do grupo
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    ).first()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas membros do grupo podem criar tópicos de discussão"
        )

    # Apenas moderador ou owner pode fixar posts na criação
    is_pinned = bool(post_in.is_pinned) and (membership.role in ("owner", "moderator"))

    post = ForumPost(
        group_id=group_id,
        author_id=user_id,
        title=post_in.title,
        content=post_in.content,
        is_pinned=is_pinned,
        is_locked=False,
        views_count=0,
        replies_count=0
    )
    db.add(post)
    group.posts_count = (group.posts_count or 0) + 1
    db.commit()
    db.refresh(post)
    return post


@router.get("/posts/{post_id}", response_model=ForumPostDetailResponse)
def get_post_details(post_id: int, db: Session = Depends(get_db)):
    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Tópico não encontrado")

    # Incrementa contador de visualizações
    post.views_count = (post.views_count or 0) + 1
    db.commit()
    db.refresh(post)

    return post


@router.patch("/posts/{post_id}", response_model=ForumPostResponse)
def update_post(
    post_id: int,
    post_update: ForumPostUpdate,
    user_id: int = Depends(require_user_id),
    db: Session = Depends(get_db)
):
    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Tópico não encontrado")

    membership = db.query(GroupMember).filter(
        GroupMember.group_id == post.group_id,
        GroupMember.user_id == user_id
    ).first()

    is_author = post.author_id == user_id
    is_mod_or_owner = membership and membership.role in ("owner", "moderator")

    if not (is_author or is_mod_or_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem permissão para atualizar este tópico"
        )

    if post_update.title is not None and is_author:
        post.title = post_update.title
    if post_update.content is not None and is_author:
        post.content = post_update.content
    if post_update.is_pinned is not None and is_mod_or_owner:
        post.is_pinned = post_update.is_pinned
    if post_update.is_locked is not None and is_mod_or_owner:
        post.is_locked = post_update.is_locked

    post.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(post)
    return post


@router.post("/posts/{post_id}/replies", response_model=ForumReplyResponse, status_code=status.HTTP_201_CREATED)
def create_forum_reply(
    post_id: int,
    reply_in: ForumReplyCreate,
    user_id: int = Depends(require_user_id),
    db: Session = Depends(get_db)
):
    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Tópico não encontrado")

    if post.is_locked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este tópico está trancado para novas respostas"
        )

    # Verifica se o usuário é membro do grupo
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == post.group_id,
        GroupMember.user_id == user_id
    ).first()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas membros do grupo podem responder a tópicos"
        )

    reply = ForumReply(
        post_id=post_id,
        author_id=user_id,
        content=reply_in.content
    )
    db.add(reply)

    post.replies_count = (post.replies_count or 0) + 1
    post.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(reply)
    return reply
