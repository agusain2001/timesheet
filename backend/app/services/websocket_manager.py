"""WebSocket manager for real-time notifications."""
from typing import Dict, List, Set
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect
import json
import asyncio


class ConnectionManager:
    """Manages WebSocket connections for real-time notifications."""
    
    def __init__(self):
        # Map of user_id to set of active connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # All connections for broadcasting
        self.all_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        
        self.active_connections[user_id].add(websocket)
        self.all_connections.add(websocket)
        
        # Send connection confirmation
        await self.send_personal(user_id, {
            "type": "connection",
            "status": "connected",
            "timestamp": datetime.utcnow().isoformat()
        })
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove a WebSocket connection."""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        
        self.all_connections.discard(websocket)
    
    async def send_personal(self, user_id: str, message: dict):
        """Send a message to a specific user's connections."""
        if user_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    disconnected.append(connection)
            
            # Clean up disconnected
            for conn in disconnected:
                self.active_connections[user_id].discard(conn)
                self.all_connections.discard(conn)
    
    async def broadcast(self, message: dict, exclude_user: str = None):
        """Broadcast a message to all connected users."""
        disconnected = []
        for user_id, connections in self.active_connections.items():
            if exclude_user and user_id == exclude_user:
                continue
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception:
                    disconnected.append((user_id, connection))
        
        # Clean up
        for user_id, conn in disconnected:
            self.active_connections[user_id].discard(conn)
            self.all_connections.discard(conn)
    
    async def send_to_team(self, team_member_ids: List[str], message: dict):
        """Send a message to all members of a team."""
        for user_id in team_member_ids:
            await self.send_personal(user_id, message)
    
    def get_online_users(self) -> List[str]:
        """Get list of currently connected user IDs."""
        return list(self.active_connections.keys())
    
    def is_user_online(self, user_id: str) -> bool:
        """Check if a user is currently online."""
        return user_id in self.active_connections


# Global connection manager instance
manager = ConnectionManager()


# Notification types
class NotificationType:
    TASK_ASSIGNED = "task_assigned"
    TASK_COMPLETED = "task_completed"
    TASK_UPDATED = "task_updated"
    TASK_COMMENT = "task_comment"
    DEADLINE_REMINDER = "deadline_reminder"
    MENTION = "mention"
    TEAM_UPDATE = "team_update"
    PROJECT_UPDATE = "project_update"


async def send_notification(
    user_id: str,
    notification_type: str,
    title: str,
    message: str,
    link: str = None,
    data: dict = None
):
    """Helper function to send a notification via WebSocket."""
    notification = {
        "type": "notification",
        "notification_type": notification_type,
        "title": title,
        "message": message,
        "link": link,
        "data": data or {},
        "timestamp": datetime.utcnow().isoformat()
    }
    await manager.send_personal(user_id, notification)


async def notify_task_assigned(user_id: str, task_name: str, assigned_by: str, task_id: str):
    """Notify user about a new task assignment."""
    await send_notification(
        user_id=user_id,
        notification_type=NotificationType.TASK_ASSIGNED,
        title="New Task Assigned",
        message=f"{assigned_by} assigned you to '{task_name}'",
        link=f"/tasks?id={task_id}",
        data={"task_id": task_id}
    )


async def notify_task_completed(user_id: str, task_name: str, completed_by: str, task_id: str):
    """Notify user about a completed task."""
    await send_notification(
        user_id=user_id,
        notification_type=NotificationType.TASK_COMPLETED,
        title="Task Completed",
        message=f"{completed_by} completed '{task_name}'",
        link=f"/tasks?id={task_id}",
        data={"task_id": task_id}
    )


async def notify_deadline_reminder(user_id: str, task_name: str, due_date: str, task_id: str):
    """Notify user about an upcoming deadline."""
    await send_notification(
        user_id=user_id,
        notification_type=NotificationType.DEADLINE_REMINDER,
        title="Deadline Reminder",
        message=f"'{task_name}' is due on {due_date}",
        link=f"/tasks?id={task_id}",
        data={"task_id": task_id}
    )


async def notify_mention(user_id: str, mentioned_by: str, context: str, link: str):
    """Notify user about being mentioned."""
    await send_notification(
        user_id=user_id,
        notification_type=NotificationType.MENTION,
        title="You were mentioned",
        message=f"{mentioned_by} mentioned you: {context[:50]}...",
        link=link
    )
