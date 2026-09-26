import os
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Tuple, Dict, Any, Optional
import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.library_item import LibraryItem
from app.models.game_session import GameSession
from app.models.quest import DynamicQuest
from app.services.ai_client import AIClient


_achievement_subscribers: Dict[int, List[asyncio.Queue]] = {}


class LibraryService:
    @staticmethod
    def grant_game(db: Session, user_id: int, game_id: int) -> Tuple[LibraryItem, bool]:
        """
        Concede a licença de um jogo a um usuário (idempotente).
        Retorna uma tupla: (item, created).
        """
        existing = db.query(LibraryItem).filter_by(user_id=user_id, game_id=game_id).first()
        if existing:
            return existing, False

        new_item = LibraryItem(
            user_id=user_id,
            game_id=game_id,
            acquired_at=datetime.now(timezone.utc),
            playtime_minutes=0,
            is_installed=False,
            last_played=None
        )
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        return new_item, True

    @staticmethod
    def get_user_games(db: Session, user_id: int) -> List[LibraryItem]:
        """
        Retorna todos os registros da biblioteca pertencentes ao usuário informado.
        """
        return db.query(LibraryItem).filter_by(user_id=user_id).order_by(LibraryItem.acquired_at.desc()).all()

    @staticmethod
    def has_game(db: Session, user_id: int, game_id: int) -> bool:
        """
        Verifica se o usuário já possui a licença do jogo informado.
        """
        return db.query(LibraryItem).filter_by(user_id=user_id, game_id=game_id).first() is not None

    @staticmethod
    async def enrich_library_items(
        items: List[LibraryItem],
        store_service_url: str,
        client: Optional[httpx.AsyncClient] = None
    ) -> List[Dict[str, Any]]:
        """
        Enriquece cada item da biblioteca com os metadados do jogo (título, banner, categoria, publisher)
        buscados no store-service.
        Usa cache de requisição e fallback resiliente caso o serviço de loja esteja inacessível.
        """
        if not items:
            return []

        unique_game_ids = list({item.game_id for item in items})
        game_cache: Dict[int, Optional[Dict[str, Any]]] = {}

        owns_client = False
        if client is None:
            client = httpx.AsyncClient(timeout=5.0)
            owns_client = True

        try:
            for gid in unique_game_ids:
                try:
                    resp = await client.get(f"{store_service_url.rstrip('/')}/games/{gid}")
                    if resp.status_code == 200:
                        data = resp.json()
                        game_cache[gid] = {
                            "title": data.get("title", f"Jogo #{gid}"),
                            "category": data.get("category"),
                            "banner_url": data.get("banner_url"),
                            "developer": data.get("developer"),
                            "publisher": data.get("publisher"),
                        }
                    else:
                        game_cache[gid] = None
                except Exception:
                    # Falha de conexão ou timeout: degradação graciosa
                    game_cache[gid] = None
        finally:
            if owns_client:
                await client.aclose()

        enriched_list = []
        for item in items:
            item_dict = item.to_dict()
            item_dict["game"] = game_cache.get(item.game_id)
            enriched_list.append(item_dict)

        return enriched_list

    @staticmethod
    def get_game_achievements(
        db: Session,
        game_id: int,
        user_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Retorna todas as conquistas cadastradas para um jogo.
        Se um user_id for fornecido, mapeia o status de desbloqueio (is_unlocked e unlocked_at).
        """
        from app.models.achievement import Achievement, UserAchievement

        achievements = (
            db.query(Achievement)
            .filter(Achievement.game_id == game_id)
            .order_by(Achievement.id.asc())
            .all()
        )

        unlocked_map: Dict[str, datetime] = {}
        if user_id:
            user_unlocks = (
                db.query(UserAchievement)
                .filter(
                    UserAchievement.user_id == user_id,
                    UserAchievement.game_id == game_id
                )
                .all()
            )
            unlocked_map = {u.achievement_id: u.unlocked_at for u in user_unlocks}

        result = []
        for ach in achievements:
            is_unlocked = ach.achievement_id in unlocked_map
            result.append({
                "id": ach.id,
                "game_id": ach.game_id,
                "achievement_id": ach.achievement_id,
                "name": ach.name,
                "description": ach.description,
                "icon_url": ach.icon_url,
                "rarity": ach.rarity,
                "is_unlocked": is_unlocked,
                "unlocked_at": unlocked_map.get(ach.achievement_id) if is_unlocked else None,
            })

        return result

    @staticmethod
    def unlock_achievement(
        db: Session,
        user_id: int,
        game_id: int,
        achievement_id: str,
        social_service_url: Optional[str] = None
    ) -> Tuple[Any, bool]:
        """
        Desbloqueia uma conquista para o usuário especificado (idempotente).
        Retorna (UserAchievement, created).
        Dispara evento de atividade para o social-service e notifica assinantes SSE.
        """
        from app.models.achievement import Achievement, UserAchievement

        existing = (
            db.query(UserAchievement)
            .filter_by(user_id=user_id, game_id=game_id, achievement_id=achievement_id)
            .first()
        )
        if existing:
            return existing, False

        new_unlock = UserAchievement(
            user_id=user_id,
            game_id=game_id,
            achievement_id=achievement_id,
            unlocked_at=datetime.now(timezone.utc),
        )
        db.add(new_unlock)
        db.commit()
        db.refresh(new_unlock)

        # Busca metadados da conquista para enriquecer eventos e notificações
        ach_meta = db.query(Achievement).filter_by(game_id=game_id, achievement_id=achievement_id).first()
        ach_name = ach_meta.name if ach_meta else achievement_id
        rarity = ach_meta.rarity if ach_meta else "Comum"
        icon_url = ach_meta.icon_url if ach_meta else None
        description = ach_meta.description if ach_meta else ""

        # 1. Dispara evento de atividade assíncrono para o social-service
        activity_payload = {
            "user_id": user_id,
            "type": "achievement_unlocked",
            "payload": {
                "game_id": game_id,
                "achievement_id": achievement_id,
                "name": ach_name,
                "description": description,
                "rarity": rarity,
                "icon_url": icon_url,
                "unlocked_at": new_unlock.unlocked_at.isoformat() if new_unlock.unlocked_at else None,
            }
        }
        LibraryService.dispatch_activity_event(activity_payload, social_service_url=social_service_url)

        # 2. Notifica assinantes SSE de conquistas
        LibraryService.publish_achievement_event(user_id, {
            "achievement_id": achievement_id,
            "game_id": game_id,
            "name": ach_name,
            "description": description,
            "rarity": rarity,
            "icon_url": icon_url,
            "unlocked_at": new_unlock.unlocked_at.isoformat() if new_unlock.unlocked_at else None,
        })

        return new_unlock, True

    @staticmethod
    def dispatch_activity_event(payload: dict, social_service_url: Optional[str] = None):
        """
        Envia evento de atividade ao social-service de forma resiliente.
        Falha de comunicação não quebra a requisição do usuário.
        """
        target_url = (social_service_url or os.getenv("SOCIAL_SERVICE_URL", "http://localhost:8004")).rstrip("/") + "/activities"
        try:
            with httpx.Client(timeout=2.0) as client:
                client.post(target_url, json=payload)
        except Exception:
            pass

    @staticmethod
    def dispatch_presence_event(
        user_id: int,
        status: str,
        game_id: Optional[int] = None,
        game_title: Optional[str] = None,
        social_service_url: Optional[str] = None
    ):
        """
        Notifica o social-service sobre a alteração de presença do usuário (Jogando / Online).
        """
        target_url = (social_service_url or os.getenv("SOCIAL_SERVICE_URL", "http://localhost:8004")).rstrip("/") + "/presence/status"
        payload = {
            "user_id": user_id,
            "status": status,
            "game_id": game_id,
            "game_title": game_title
        }
        try:
            with httpx.Client(timeout=2.0) as client:
                client.post(target_url, json=payload)
        except Exception:
            pass

    @staticmethod
    def get_recent_unlocked_achievements(
        db: Session,
        user_id: int,
        since: Optional[datetime] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Retorna conquistas desbloqueadas recentemente pelo usuário informado.
        Útil para polling leve no frontend e verificação de novas conquistas.
        """
        from app.models.achievement import Achievement, UserAchievement

        query = db.query(UserAchievement).filter(UserAchievement.user_id == user_id)
        if since:
            query = query.filter(UserAchievement.unlocked_at >= since)
        else:
            # Fallback padrão: últimos 60 segundos se since não for especificado
            threshold = datetime.now(timezone.utc) - timedelta(seconds=60)
            query = query.filter(UserAchievement.unlocked_at >= threshold)

        recent_unlocks = query.order_by(UserAchievement.unlocked_at.desc()).limit(limit).all()

        result = []
        for u in recent_unlocks:
            ach = db.query(Achievement).filter_by(game_id=u.game_id, achievement_id=u.achievement_id).first()
            result.append({
                "achievement_id": u.achievement_id,
                "game_id": u.game_id,
                "name": ach.name if ach else u.achievement_id,
                "description": ach.description if ach else "",
                "icon_url": ach.icon_url if ach else None,
                "rarity": ach.rarity if ach else "Comum",
                "unlocked_at": u.unlocked_at.isoformat() if u.unlocked_at else None,
            })
        return result

    @staticmethod
    def register_achievement_subscriber(user_id: int) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        _achievement_subscribers.setdefault(user_id, []).append(queue)
        return queue

    @staticmethod
    def unregister_achievement_subscriber(user_id: int, queue: asyncio.Queue):
        if user_id in _achievement_subscribers:
            try:
                _achievement_subscribers[user_id].remove(queue)
                if not _achievement_subscribers[user_id]:
                    del _achievement_subscribers[user_id]
            except ValueError:
                pass

    @staticmethod
    def publish_achievement_event(user_id: int, event_data: dict):
        queues = _achievement_subscribers.get(user_id, [])
        for q in list(queues):
            try:
                q.put_nowait(event_data)
            except Exception:
                pass

    @staticmethod
    def start_session(
        db: Session,
        user_id: int,
        game_id: int,
        session_token: Optional[str] = None
    ) -> Tuple[GameSession, LibraryItem]:
        """
        Inicializa uma sessão de jogo.
        - Encerra sessões anteriores ativas para este usuário e jogo.
        - Atualiza a posse da biblioteca com last_played = now e is_installed = True.
        - Cria um novo registro GameSession ativo.
        """
        now = datetime.now(timezone.utc)

        # Encerra eventuais sessões anteriores que ficaram pendentes/ativas
        previous_active = (
            db.query(GameSession)
            .filter_by(user_id=user_id, game_id=game_id, status="active")
            .all()
        )
        for s in previous_active:
            s.status = "ended"
            s.ended_at = now

        # Garante item na biblioteca e atualiza telemetria básica
        item = db.query(LibraryItem).filter_by(user_id=user_id, game_id=game_id).first()
        if not item:
            item, _ = LibraryService.grant_game(db, user_id=user_id, game_id=game_id)
        
        item.is_installed = True
        item.last_played = now

        new_session = GameSession(
            user_id=user_id,
            game_id=game_id,
            session_token=session_token,
            status="active",
            started_at=now,
            last_ping_at=now,
            duration_seconds=0
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        db.refresh(item)

        # Notifica o social-service sobre o status "playing" (F-05)
        KNOWN_GAMES = {
            1: "Astro Dash",
            2: "Pixel Quest",
            3: "Cyber Runner",
            4: "Neon Horizon",
            10: "Helldivers 2",
            11: "Hollow Knight",
            12: "Space Marine 2",
            13: "MIST Studios Adventure",
        }
        game_title = KNOWN_GAMES.get(game_id, f"Jogo #{game_id}")
        LibraryService.dispatch_presence_event(user_id=user_id, status="playing", game_id=game_id, game_title=game_title)

        return new_session, item

    @staticmethod
    def ping_session(
        db: Session,
        user_id: int,
        game_id: int,
        session_id: Optional[str] = None,
        session_token: Optional[str] = None
    ) -> Tuple[GameSession, int]:
        """
        Processa o heartbeat da sessão e acumula tempo de jogo (playtime).
        - Incrementa playtime_minutes no LibraryItem (+1 minuto por ping).
        - Atualiza last_ping_at e duration_seconds na GameSession.
        """
        now = datetime.now(timezone.utc)

        query = db.query(GameSession).filter_by(user_id=user_id, game_id=game_id, status="active")
        if session_id:
            query = query.filter_by(session_id=session_id)
        session = query.order_by(GameSession.started_at.desc()).first()

        # Resiliência: se nenhuma sessão ativa for encontrada, inicializa uma nova
        if not session:
            session, item = LibraryService.start_session(db, user_id, game_id, session_token)
        else:
            item = db.query(LibraryItem).filter_by(user_id=user_id, game_id=game_id).first()
            if not item:
                item, _ = LibraryService.grant_game(db, user_id, game_id)

        # Incrementa playtime (+1 minuto por ping recebido)
        item.playtime_minutes += 1
        item.last_played = now
        item.is_installed = True

        session.last_ping_at = now
        session.duration_seconds += 60

        db.commit()
        db.refresh(session)
        db.refresh(item)
        return session, item.playtime_minutes

    @staticmethod
    def end_session(
        db: Session,
        user_id: int,
        game_id: int,
        session_id: Optional[str] = None,
        session_token: Optional[str] = None
    ) -> Tuple[Optional[GameSession], int]:
        """
        Encerra formalmente uma sessão ativa de jogo.
        """
        now = datetime.now(timezone.utc)

        query = db.query(GameSession).filter_by(user_id=user_id, game_id=game_id, status="active")
        if session_id:
            query = query.filter_by(session_id=session_id)
        session = query.order_by(GameSession.started_at.desc()).first()

        if session:
            session.status = "ended"
            session.ended_at = now
            db.commit()
            db.refresh(session)

            # Notifica o social-service que o usuário voltou a ficar "online" (F-05)
            LibraryService.dispatch_presence_event(user_id=user_id, status="online", game_id=None, game_title=None)

        item = db.query(LibraryItem).filter_by(user_id=user_id, game_id=game_id).first()
        playtime = item.playtime_minutes if item else 0
        return session, playtime

    @staticmethod
    async def get_or_generate_weekly_quests(
        db: Session,
        user_id: int,
        game_id: int,
        store_service_url: str = "http://localhost:8002",
        client: Optional[httpx.AsyncClient] = None
    ) -> List[dict]:
        """
        MIST Quest Master (G-03): Retorna ou gera desafios semanais dinâmicos por jogo,
        acompanhando o progresso de tempo de jogo e conquistas do usuário.
        """
        now = datetime.now(timezone.utc)
        week_key = f"{now.year}-W{now.isocalendar()[1]}"

        existing_quests = db.query(DynamicQuest).filter_by(
            user_id=user_id,
            game_id=game_id,
            week_key=week_key
        ).all()

        item = db.query(LibraryItem).filter_by(user_id=user_id, game_id=game_id).first()
        playtime = item.playtime_minutes if item else 0

        from app.models.achievement import UserAchievement
        unlocked_count = db.query(UserAchievement).filter_by(user_id=user_id, game_id=game_id).count()

        if not existing_quests:
            game_title = f"Game {game_id}"
            game_category = "Ação"

            owns_client = False
            if client is None:
                client = httpx.AsyncClient(timeout=4.0)
                owns_client = True
            try:
                resp = await client.get(f"{store_service_url.rstrip('/')}/games/{game_id}")
                if resp.status_code == 200:
                    data = resp.json()
                    game_title = data.get("title", game_title)
                    game_category = data.get("category", game_category)
            except Exception:
                pass
            finally:
                if owns_client:
                    await client.aclose()

            ai_client = AIClient()
            generated = await ai_client.generate_dynamic_quests(
                game_title=game_title,
                game_category=game_category,
                user_playtime_minutes=playtime
            )

            created_quests = []
            for q_data in generated:
                quest_key = str(q_data.get("id", f"quest_{len(created_quests)+1}"))
                if "target_minutes" in q_data:
                    target_type = "playtime"
                    target_val = int(q_data["target_minutes"])
                elif "target_achievements" in q_data:
                    target_type = "achievements"
                    target_val = int(q_data["target_achievements"])
                else:
                    target_type = "score"
                    target_val = int(q_data.get("target_score", 100))

                quest = DynamicQuest(
                    user_id=user_id,
                    game_id=game_id,
                    quest_key=quest_key,
                    title=q_data.get("title", f"Desafio em {game_title}"),
                    description=q_data.get("description", "Complete o objetivo nesta semana."),
                    xp_reward=int(q_data.get("xp_reward", 200)),
                    target_type=target_type,
                    target_value=target_val,
                    progress=0,
                    is_completed=False,
                    is_claimed=False,
                    week_key=week_key,
                    created_at=now
                )
                db.add(quest)
                created_quests.append(quest)

            db.commit()
            for q in created_quests:
                db.refresh(q)
            existing_quests = created_quests

        result = []
        for q in existing_quests:
            if q.target_type == "playtime":
                q.progress = min(playtime, q.target_value)
            elif q.target_type == "achievements":
                q.progress = min(unlocked_count, q.target_value)
            else:
                q.progress = q.progress

            if q.progress >= q.target_value and not q.is_completed:
                q.is_completed = True

            result.append(q.to_dict())

        db.commit()
        return result

    @staticmethod
    def claim_quest(db: Session, user_id: int, game_id: int, quest_id: int) -> dict:
        quest = db.query(DynamicQuest).filter_by(id=quest_id, user_id=user_id, game_id=game_id).first()
        if not quest:
            raise HTTPException(status_code=404, detail="Desafio não encontrado.")
        if not quest.is_completed:
            raise HTTPException(status_code=400, detail="Desafio ainda não completado.")
        if quest.is_claimed:
            raise HTTPException(status_code=400, detail="Recompensa já resgatada anteriormente.")

        quest.is_claimed = True
        db.commit()
        db.refresh(quest)
        return {
            "status": "claimed",
            "quest_id": quest.id,
            "xp_reward": quest.xp_reward,
            "message": f"Você resgatou {quest.xp_reward} XP pelo desafio '{quest.title}'!"
        }


