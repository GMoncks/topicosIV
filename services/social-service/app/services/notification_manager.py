import logging
from typing import Dict, Set
from collections import defaultdict
from fastapi import WebSocket

logger = logging.getLogger("social_service.notifications")


class NotificationManager:
    def __init__(self):
        # Mapeia user_id -> Set de WebSockets ativos do usuário
        self.active_connections: Dict[int, Set[WebSocket]] = defaultdict(set)
        self.socket_users: Dict[WebSocket, int] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections[user_id].add(websocket)
        self.socket_users[websocket] = user_id
        logger.info(f"Notification WS: Usuário {user_id} conectado. Conexões ativas: {len(self.active_connections[user_id])}")

    def disconnect(self, websocket: WebSocket):
        user_id = self.socket_users.pop(websocket, None)
        if user_id and user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
            logger.info(f"Notification WS: Usuário {user_id} desconectado.")

    async def notify_user(self, user_id: int, payload: dict):
        """
        Envia uma notificação em tempo real para todos os websockets ativos do user_id.
        """
        connections = self.active_connections.get(user_id, set()).copy()
        if not connections:
            return

        dead_sockets = []
        for ws in connections:
            try:
                await ws.send_json(payload)
            except Exception as e:
                logger.warning(f"Erro ao enviar notificação via WS para user {user_id}: {e}")
                dead_sockets.append(ws)

        for ws in dead_sockets:
            self.disconnect(ws)


# Instância singleton global do NotificationManager
notification_manager = NotificationManager()
