import json
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.database import get_db
from app.models.group import Group, GroupMember
from app.models.group_message import GroupMessage
from app.schemas.group import GroupCreate, GroupResponse, GroupMemberResponse, GroupMessageCreate, GroupMessageResponse
from app.services.group_chat_manager import group_chat_manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["groups"])


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


@router.post("/groups", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(
    group_in: GroupCreate,
    user_id: int = Depends(require_user_id),
    db: Session = Depends(get_db)
):
    group = Group(
        name=group_in.name,
        description=group_in.description,
        avatar_url=group_in.avatar_url,
        header_url=group_in.header_url,
        category=group_in.category or "Geral",
        is_private=group_in.is_private or False,
        owner_id=user_id,
        members_count=1,
        posts_count=0
    )
    db.add(group)
    db.commit()
    db.refresh(group)

    # Adiciona o criador como membro com papel de owner
    member = GroupMember(
        group_id=group.id,
        user_id=user_id,
        role="owner"
    )
    db.add(member)
    db.commit()

    resp = GroupResponse.model_validate(group)
    resp.is_member = True
    resp.role = "owner"
    return resp


@router.get("/groups", response_model=List[GroupResponse])
def list_groups(
    category: Optional[str] = None,
    q: Optional[str] = None,
    search: Optional[str] = None,
    limit: Optional[int] = None,
    my_groups: Optional[bool] = False,
    user_id: Optional[int] = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    query = db.query(Group)

    if category and category != "all":
        query = query.filter(Group.category == category)

    effective_term = q or search
    if effective_term and effective_term.strip():
        search_filter = f"%{effective_term.strip()}%"
        query = query.filter(
            or_(
                Group.name.ilike(search_filter),
                Group.description.ilike(search_filter)
            )
        )

    if my_groups and user_id:
        group_ids = [m.group_id for m in db.query(GroupMember.group_id).filter(GroupMember.user_id == user_id).all()]
        query = query.filter(Group.id.in_(group_ids))

    query = query.order_by(Group.members_count.desc(), Group.id.desc())
    if limit and limit > 0:
        query = query.limit(limit)
    groups = query.all()

    # Mapeia adesão do usuário autenticado caso presente
    user_memberships = {}
    if user_id:
        members = db.query(GroupMember).filter(GroupMember.user_id == user_id).all()
        user_memberships = {m.group_id: m.role for m in members}

    result = []
    for g in groups:
        r = GroupResponse.model_validate(g)
        r.is_member = g.id in user_memberships
        r.role = user_memberships.get(g.id)
        result.append(r)

    return result


@router.get("/groups/{group_id}", response_model=GroupResponse)
def get_group(
    group_id: int,
    user_id: Optional[int] = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")

    resp = GroupResponse.model_validate(group)
    if user_id:
        membership = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id
        ).first()
        if membership:
            resp.is_member = True
            resp.role = membership.role
        else:
            resp.is_member = False
            resp.role = None
    return resp


@router.post("/groups/{group_id}/join", response_model=GroupResponse)
def join_group(
    group_id: int,
    user_id: int = Depends(require_user_id),
    db: Session = Depends(get_db)
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")

    existing = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    ).first()

    if not existing:
        member = GroupMember(group_id=group_id, user_id=user_id, role="member")
        db.add(member)
        group.members_count = (group.members_count or 0) + 1
        db.commit()
        db.refresh(group)
        role = "member"
    else:
        role = existing.role

    resp = GroupResponse.model_validate(group)
    resp.is_member = True
    resp.role = role
    return resp


@router.post("/groups/{group_id}/leave", response_model=GroupResponse)
def leave_group(
    group_id: int,
    user_id: int = Depends(require_user_id),
    db: Session = Depends(get_db)
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")

    existing = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    ).first()

    if existing:
        db.delete(existing)
        group.members_count = max(0, (group.members_count or 1) - 1)
        db.commit()
        db.refresh(group)

    resp = GroupResponse.model_validate(group)
    resp.is_member = False
    resp.role = None
    return resp


@router.get("/groups/{group_id}/members", response_model=List[GroupMemberResponse])
def list_group_members(group_id: int, db: Session = Depends(get_db)):
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).order_by(
        GroupMember.role == "owner",
        GroupMember.role == "moderator",
        GroupMember.joined_at.asc()
    ).all()
    return members


@router.get("/groups/{group_id}/chat/messages", response_model=List[GroupMessageResponse])
def get_group_chat_messages(group_id: int, db: Session = Depends(get_db)):
    messages = db.query(GroupMessage).filter(GroupMessage.group_id == group_id).order_by(
        GroupMessage.created_at.asc()
    ).limit(100).all()
    return messages


@router.post("/groups/{group_id}/chat/messages", response_model=GroupMessageResponse, status_code=status.HTTP_201_CREATED)
async def post_group_chat_message(
    group_id: int,
    msg_in: GroupMessageCreate,
    user_id: int = Depends(require_user_id),
    db: Session = Depends(get_db)
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")

    msg = GroupMessage(
        group_id=group_id,
        user_id=user_id,
        username=f"User #{user_id}",
        content=msg_in.content
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # Disparo de broadcast para clientes conectados via WebSocket no grupo
    payload = {
        "type": "chat_message",
        "id": msg.id,
        "group_id": group_id,
        "user_id": user_id,
        "username": msg.username,
        "content": msg.content,
        "created_at": msg.created_at.isoformat()
    }
    await group_chat_manager.broadcast_message(group_id, payload)

    return msg


@router.websocket("/ws/group/{group_id}/chat")
async def websocket_group_chat_endpoint(
    websocket: WebSocket,
    group_id: int,
    user_id: int = Query(1),
    db: Session = Depends(get_db)
):
    await group_chat_manager.connect(group_id, websocket, user_id)
    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
            except Exception:
                data = {"type": "chat_message", "content": raw_text}

            msg_type = data.get("type", "chat_message")
            if msg_type == "chat_message":
                content = data.get("content", "").strip()
                if content:
                    msg = GroupMessage(
                        group_id=group_id,
                        user_id=user_id,
                        username=data.get("username") or f"User #{user_id}",
                        content=content
                    )
                    db.add(msg)
                    db.commit()
                    db.refresh(msg)

                    out_payload = {
                        "type": "chat_message",
                        "id": msg.id,
                        "group_id": group_id,
                        "user_id": user_id,
                        "username": msg.username,
                        "content": msg.content,
                        "created_at": msg.created_at.isoformat()
                    }
                    await group_chat_manager.broadcast_message(group_id, out_payload)
    except WebSocketDisconnect:
        group_chat_manager.disconnect(group_id, websocket)
    except Exception as e:
        logger.error(f"WebSocket error in group {group_id}: {e}")
        group_chat_manager.disconnect(group_id, websocket)
