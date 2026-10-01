import logging
from typing import Dict, Set, Optional
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class GroupChatConnectionManager:
    def __init__(self):
        # group_id -> Set[WebSocket]
        self.active_groups: Dict[int, Set[WebSocket]] = {}
        # WebSocket -> user_id
        self.socket_users: Dict[WebSocket, int] = {}

    async def connect(self, group_id: int, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if group_id not in self.active_groups:
            self.active_groups[group_id] = set()
        self.active_groups[group_id].add(websocket)
        self.socket_users[websocket] = user_id
        logger.info(f"User {user_id} connected to group {group_id} chat")

    def disconnect(self, group_id: int, websocket: WebSocket):
        if group_id in self.active_groups and websocket in self.active_groups[group_id]:
            self.active_groups[group_id].remove(websocket)
            if not self.active_groups[group_id]:
                del self.active_groups[group_id]
        if websocket in self.socket_users:
            user_id = self.socket_users.pop(websocket)
            logger.info(f"User {user_id} disconnected from group {group_id} chat")

    async def broadcast_message(self, group_id: int, message_data: dict):
        if group_id not in self.active_groups:
            return
        dead_sockets = set()
        for connection in list(self.active_groups[group_id]):
            try:
                await connection.send_json(message_data)
            except Exception as e:
                logger.warning(f"Error sending message in group {group_id}: {e}")
                dead_sockets.add(connection)
        for dead in dead_sockets:
            self.disconnect(group_id, dead)


group_chat_manager = GroupChatConnectionManager()
