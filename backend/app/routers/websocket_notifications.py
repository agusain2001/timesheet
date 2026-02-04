"""WebSocket router for real-time notifications."""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.services.websocket_manager import manager, NotificationType
import json

router = APIRouter()


async def get_user_from_token(token: str, db: Session) -> User:
    """Validate token and get user for WebSocket connection."""
    from app.utils import verify_token
    try:
        payload = verify_token(token)
        user_id = payload.get("sub")
        if not user_id:
            return None
        user = db.query(User).filter(User.id == user_id).first()
        return user
    except Exception:
        return None


@router.websocket("/ws/notifications")
async def websocket_notifications(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for real-time notifications."""
    # Authenticate
    user = await get_user_from_token(token, db)
    if not user:
        await websocket.close(code=4001, reason="Unauthorized")
        return
    
    user_id = str(user.id)
    
    # Connect
    await manager.connect(websocket, user_id)
    
    try:
        while True:
            # Listen for client messages
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                msg_type = message.get("type")
                
                if msg_type == "ping":
                    # Heartbeat
                    await websocket.send_json({"type": "pong"})
                
                elif msg_type == "mark_read":
                    # Mark notification as read
                    notification_id = message.get("notification_id")
                    if notification_id:
                        from app.models import Notification
                        from datetime import datetime
                        notif = db.query(Notification).filter(
                            Notification.id == notification_id,
                            Notification.user_id == user_id
                        ).first()
                        if notif:
                            notif.is_read = True
                            notif.read_at = datetime.utcnow()
                            db.commit()
                            await websocket.send_json({
                                "type": "read_confirmed",
                                "notification_id": notification_id
                            })
                
                elif msg_type == "get_unread_count":
                    # Get current unread count
                    from app.models import Notification
                    count = db.query(Notification).filter(
                        Notification.user_id == user_id,
                        Notification.is_read == False
                    ).count()
                    await websocket.send_json({
                        "type": "unread_count",
                        "count": count
                    })
                
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)


@router.get("/online-users")
async def get_online_users():
    """Get list of currently online user IDs."""
    return {"online_users": manager.get_online_users()}


@router.post("/send-test-notification")
async def send_test_notification(user_id: str, message: str):
    """Send a test notification (for debugging)."""
    from app.services.websocket_manager import send_notification
    await send_notification(
        user_id=user_id,
        notification_type=NotificationType.TASK_UPDATED,
        title="Test Notification",
        message=message
    )
    return {"status": "sent"}
