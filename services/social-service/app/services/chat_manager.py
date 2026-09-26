import logging
from typing import Dict, Set, Optional
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ChatConnectionManager:
    def __init__(self):
        # room_id -> Set[WebSocket]
        self.active_rooms: Dict[str, Set[WebSocket]] = {}
        # WebSocket -> user_id
        self.socket_users: Dict[WebSocket, int] = {}

    async def connect(self, room_id: str, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if room_id not in self.active_rooms:
            self.active_rooms[room_id] = set()
        self.active_rooms[room_id].add(websocket)
        self.socket_users[websocket] = user_id
        logger.info(f"User {user_id} connected to chat room {room_id}")

    def disconnect(self, room_id: str, websocket: WebSocket):
        if room_id in self.active_rooms and websocket in self.active_rooms[room_id]:
            self.active_rooms[room_id].remove(websocket)
            if not self.active_rooms[room_id]:
                del self.active_rooms[room_id]
        if websocket in self.socket_users:
            user_id = self.socket_users.pop(websocket)
            logger.info(f"User {user_id} disconnected from chat room {room_id}")

    async def broadcast_message(self, room_id: str, message_data: dict):
        if room_id not in self.active_rooms:
            return
        dead_sockets = set()
        for connection in list(self.active_rooms[room_id]):
            try:
                await connection.send_json(message_data)
            except Exception as e:
                logger.warning(f"Error sending message to websocket in room {room_id}: {e}")
                dead_sockets.add(connection)
        for dead in dead_sockets:
            self.disconnect(room_id, dead)

    async def broadcast_typing(self, room_id: str, user_id: int, is_typing: bool, exclude: Optional[WebSocket] = None):
        if room_id not in self.active_rooms:
            return
        payload = {
            "type": "typing",
            "room_id": room_id,
            "user_id": user_id,
            "is_typing": is_typing,
        }
        dead_sockets = set()
        for connection in list(self.active_rooms[room_id]):
            if exclude and connection == exclude:
                continue
            try:
                await connection.send_json(payload)
            except Exception as e:
                logger.warning(f"Error broadcasting typing status in room {room_id}: {e}")
                dead_sockets.add(connection)
        for dead in dead_sockets:
            self.disconnect(room_id, dead)


chat_manager = ChatConnectionManager()
