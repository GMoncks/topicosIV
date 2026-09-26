import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class PresenceManager:
    def __init__(self):
        # WebSocket -> user_id
        self.active_connections: Dict[WebSocket, int] = {}
        # user_id -> presence dict
        self.user_presence: Dict[int, dict] = {}

    def _now_iso(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections[websocket] = user_id

        # Preserva status "playing" se já estava jogando, senão assume "online"
        current = self.user_presence.get(user_id)
        if not current or current.get("status") not in ("playing", "away"):
            self.user_presence[user_id] = {
                "user_id": user_id,
                "status": "online",
                "game_id": None,
                "game_title": None,
                "last_seen": self._now_iso(),
            }
        else:
            self.user_presence[user_id]["last_seen"] = self._now_iso()

        # Envia snapshot para o cliente recém-conectado
        try:
            await websocket.send_json({
                "type": "presence_snapshot",
                "users": list(self.user_presence.values())
            })
        except Exception as e:
            logger.warning(f"Failed to send presence snapshot to user {user_id}: {e}")

        # Notifica os demais da conexão
        await self.broadcast_update(user_id)
        logger.info(f"User {user_id} connected to presence WebSocket")

    async def disconnect(self, websocket: WebSocket):
        if websocket not in self.active_connections:
            return
        user_id = self.active_connections.pop(websocket)

        # Verifica se o mesmo usuário ainda tem outro WebSocket aberto (ex: outra aba)
        still_connected = any(uid == user_id for uid in self.active_connections.values())
        if not still_connected:
            if user_id in self.user_presence:
                self.user_presence[user_id]["status"] = "offline"
                self.user_presence[user_id]["last_seen"] = self._now_iso()
                await self.broadcast_update(user_id, force_status="offline")
            logger.info(f"User {user_id} disconnected from presence (marked offline)")

    async def update_status(
        self,
        user_id: int,
        status: str,
        game_id: Optional[int] = None,
        game_title: Optional[str] = None
    ):
        self.user_presence[user_id] = {
            "user_id": user_id,
            "status": status,
            "game_id": game_id,
            "game_title": game_title,
            "last_seen": self._now_iso(),
        }
        await self.broadcast_update(user_id)
        logger.info(f"Updated presence for user {user_id}: status={status}, game={game_title}")

    async def broadcast_update(self, user_id: int, force_status: Optional[str] = None):
        info = self.user_presence.get(user_id, {
            "user_id": user_id,
            "status": force_status or "offline",
            "game_id": None,
            "game_title": None,
            "last_seen": self._now_iso(),
        })
        payload = {
            "type": "presence_update",
            **info
        }
        if force_status:
            payload["status"] = force_status

        dead_sockets = []
        for socket in list(self.active_connections.keys()):
            try:
                await socket.send_json(payload)
            except Exception as e:
                logger.warning(f"Error broadcasting presence to socket: {e}")
                dead_sockets.append(socket)

        for dead in dead_sockets:
            if dead in self.active_connections:
                del self.active_connections[dead]

    def get_snapshot(self) -> List[dict]:
        return list(self.user_presence.values())

    def get_user_status(self, user_id: int) -> dict:
        return self.user_presence.get(user_id, {
            "user_id": user_id,
            "status": "offline",
            "game_id": None,
            "game_title": None,
            "last_seen": None,
        })


presence_manager = PresenceManager()
