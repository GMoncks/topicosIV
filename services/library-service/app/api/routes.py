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
SOCIAL_SERVICE_URL = os.getenv("SOCIAL_SERVICE_URL", "http://localhost:8004")



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
        achievement_id=payload.achievement_id,
        social_service_url=SOCIAL_SERVICE_URL
    )

    return {
        "status": "unlocked" if created else "already_unlocked",
        "achievement_id": unlock.achievement_id,
        "unlocked_at": unlock.unlocked_at.isoformat() if unlock.unlocked_at else None,
        "created": created
    }


from app.schemas.session import (
    SessionStartRequest,
    SessionStartResponse,
    SessionPingRequest,
    SessionPingResponse,
    SessionEndRequest,
    SessionEndResponse,
)


@router.post(
    "/session/start",
    response_model=SessionStartResponse,
    status_code=status.HTTP_200_OK,
    summary="Inicia uma sessão de jogo (E-04)"
)
@router.post(
    "/library/session/start",
    response_model=SessionStartResponse,
    status_code=status.HTTP_200_OK,
    summary="Inicia uma sessão de jogo via Gateway (E-04)"
)
def start_game_session(
    payload: SessionStartRequest,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    user_id = payload.user_id
    if x_user_id:
        try:
            user_id = int(x_user_id)
        except ValueError:
            pass

    session, item = LibraryService.start_session(
        db=db,
        user_id=user_id,
        game_id=payload.game_id,
        session_token=payload.session_token
    )

    return SessionStartResponse(
        status=session.status,
        session_id=session.session_id,
        user_id=session.user_id,
        game_id=session.game_id,
        started_at=session.started_at,
        is_installed=item.is_installed if item else True
    )


@router.post(
    "/session/ping",
    response_model=SessionPingResponse,
    status_code=status.HTTP_200_OK,
    summary="Heartbeat da sessão acumulando tempo de jogo (E-04)"
)
@router.post(
    "/library/session/ping",
    response_model=SessionPingResponse,
    status_code=status.HTTP_200_OK,
    summary="Heartbeat da sessão acumulando tempo de jogo via Gateway (E-04)"
)
def ping_game_session(
    payload: SessionPingRequest,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    user_id = payload.user_id
    if x_user_id:
        try:
            user_id = int(x_user_id)
        except ValueError:
            pass

    session, playtime_minutes = LibraryService.ping_session(
        db=db,
        user_id=user_id,
        game_id=payload.game_id,
        session_id=payload.session_id,
        session_token=payload.session_token
    )

    return SessionPingResponse(
        status=session.status,
        session_id=session.session_id,
        user_id=session.user_id,
        game_id=session.game_id,
        playtime_minutes=playtime_minutes,
        last_ping_at=session.last_ping_at
    )


@router.post(
    "/session/end",
    response_model=SessionEndResponse,
    status_code=status.HTTP_200_OK,
    summary="Encerra uma sessão de jogo (E-04)"
)
@router.post(
    "/library/session/end",
    response_model=SessionEndResponse,
    status_code=status.HTTP_200_OK,
    summary="Encerra uma sessão de jogo via Gateway (E-04)"
)
def end_game_session(
    payload: SessionEndRequest,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    user_id = payload.user_id
    if x_user_id:
        try:
            user_id = int(x_user_id)
        except ValueError:
            pass

    session, playtime_minutes = LibraryService.end_session(
        db=db,
        user_id=user_id,
        game_id=payload.game_id,
        session_id=payload.session_id,
        session_token=payload.session_token
    )

    ended_at = session.ended_at if session and session.ended_at else session.last_ping_at if session else None

    from datetime import datetime, timezone
    return SessionEndResponse(
        status="ended",
        session_id=session.session_id if session else (payload.session_id or "ended"),
        user_id=user_id,
        game_id=payload.game_id,
        playtime_minutes=playtime_minutes,
        ended_at=ended_at or datetime.now(timezone.utc)
    )


@router.get(
    "/achievements/recent",
    status_code=status.HTTP_200_OK,
    summary="Consulta conquistas desbloqueadas recentemente para polling leve (E-07)"
)
@router.get(
    "/library/achievements/recent",
    status_code=status.HTTP_200_OK,
    summary="Consulta conquistas desbloqueadas recentemente via Gateway (E-07)"
)
def get_recent_achievements(
    since: Optional[str] = None,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Header X-User-Id obrigatório para consultar conquistas recentes."
        )

    try:
        user_id = int(x_user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="X-User-Id inválido.")

    since_dt = None
    if since:
        try:
            from datetime import datetime
            since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
        except Exception:
            pass

    recent = LibraryService.get_recent_unlocked_achievements(
        db=db,
        user_id=user_id,
        since=since_dt
    )
    return recent


from fastapi.responses import StreamingResponse
import json
import asyncio


@router.get(
    "/achievements/stream",
    summary="Stream SSE em tempo real de conquistas desbloqueadas (E-07)"
)
@router.get(
    "/library/achievements/stream",
    summary="Stream SSE em tempo real via Gateway (E-07)"
)
async def stream_achievements(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id")
):
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Header X-User-Id obrigatório para conexão SSE."
        )

    try:
        user_id = int(x_user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="X-User-Id inválido.")

    async def event_generator():
        queue = LibraryService.register_achievement_subscriber(user_id)
        try:
            yield "data: {\"type\": \"connected\"}\n\n"
            while True:
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=20.0)
                    yield f"event: achievement_unlocked\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
                except asyncio.TimeoutError:
                    # Heartbeat para manter a conexão aberta
                    yield ": ping\n\n"
        finally:
            LibraryService.unregister_achievement_subscriber(user_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get(
    "/library/users/{user_id}/games",
    status_code=status.HTTP_200_OK,
    summary="Lista os jogos adquiridos por um usuário específico (chamada interna do Curator)"
)
async def get_user_games_by_id(
    user_id: int,
    db: Session = Depends(get_db)
):
    items = LibraryService.get_user_games(db=db, user_id=user_id)
    enriched = await LibraryService.enrich_library_items(
        items=items,
        store_service_url=STORE_SERVICE_URL
    )
    result = []
    for it in enriched:
        g = it.get("game") or {}
        result.append({
            "game_id": it.get("game_id"),
            "title": g.get("title", f"Game {it.get('game_id')}"),
            "category": g.get("category"),
            "tags": g.get("tags") or [],
            "playtime_minutes": it.get("playtime_minutes", 0),
        })
    return result


@router.get(
    "/library/games/{game_id}/quests",
    status_code=status.HTTP_200_OK,
    summary="MIST Quest Master (G-03): Desafios e conquistas semanais dinâmicas por jogo"
)
async def get_game_quests(
    game_id: int,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    user_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    effective_user_id = user_id
    if x_user_id:
        try:
            effective_user_id = int(x_user_id)
        except ValueError:
            pass
    if not effective_user_id:
        effective_user_id = 1

    return await LibraryService.get_or_generate_weekly_quests(
        db=db,
        user_id=effective_user_id,
        game_id=game_id,
        store_service_url=STORE_SERVICE_URL
    )


@router.post(
    "/library/games/{game_id}/quests/{quest_id}/claim",
    status_code=status.HTTP_200_OK,
    summary="Resgata recompensa de XP de um desafio completado"
)
def claim_quest_reward(
    game_id: int,
    quest_id: int,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    user_id = 1
    if x_user_id:
        try:
            user_id = int(x_user_id)
        except ValueError:
            pass
    return LibraryService.claim_quest(
        db=db,
        user_id=user_id,
        game_id=game_id,
        quest_id=quest_id
    )


