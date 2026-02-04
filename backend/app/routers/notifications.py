"""Notifications API router."""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from app.database import get_db
from app.models import User, Notification, NotificationPreference
from app.utils import get_current_active_user

router = APIRouter()

# Schemas
class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    message: Optional[str] = None
    link: Optional[str] = None
    is_read: bool
    created_at: datetime
    class Config:
        from_attributes = True

class NotificationPreferenceResponse(BaseModel):
    email_enabled: bool
    push_enabled: bool
    task_assigned: bool
    task_completed: bool
    daily_digest: bool
    weekly_digest: bool
    class Config:
        from_attributes = True

class NotificationPreferenceUpdate(BaseModel):
    email_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    task_assigned: Optional[bool] = None
    task_completed: Optional[bool] = None
    daily_digest: Optional[bool] = None
    weekly_digest: Optional[bool] = None

# Endpoints
@router.get("/")
def get_notifications(
    skip: int = 0, limit: int = 50, unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_archived == False
    )
    if unread_only:
        query = query.filter(Notification.is_read == False)
    total = query.count()
    unread = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    items = query.order_by(desc(Notification.created_at)).offset(skip).limit(limit).all()
    return {"items": items, "total": total, "unread_count": unread}

@router.get("/unread-count")
def get_unread_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id, Notification.is_read == False
    ).count()
    return {"unread_count": count}

@router.put("/{notification_id}/read")
def mark_as_read(notification_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    notif = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    notif.read_at = datetime.utcnow()
    db.commit()
    return {"message": "Marked as read"}

@router.put("/mark-all-read")
def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).update({"is_read": True, "read_at": datetime.utcnow()})
    db.commit()
    return {"message": "All marked as read"}

@router.get("/preferences", response_model=NotificationPreferenceResponse)
def get_preferences(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    prefs = db.query(NotificationPreference).filter(NotificationPreference.user_id == current_user.id).first()
    if not prefs:
        prefs = NotificationPreference(user_id=current_user.id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    return prefs

@router.put("/preferences", response_model=NotificationPreferenceResponse)
def update_preferences(data: NotificationPreferenceUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    prefs = db.query(NotificationPreference).filter(NotificationPreference.user_id == current_user.id).first()
    if not prefs:
        prefs = NotificationPreference(user_id=current_user.id)
        db.add(prefs)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(prefs, field, value)
    db.commit()
    db.refresh(prefs)
    return prefs


# Schema for creating notifications
class NotificationCreate(BaseModel):
    type: str = "system"
    title: str
    message: Optional[str] = None
    link: Optional[str] = None


@router.post("/", response_model=NotificationResponse)
def create_notification(
    data: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new notification for the current user."""
    notification = Notification(
        user_id=current_user.id,
        type=data.type,
        title=data.title,
        message=data.message,
        link=data.link,
        is_read=False
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


@router.post("/sample")
def create_sample_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create sample notifications for testing."""
    sample_notifications = [
        {
            "type": "task_assigned",
            "title": "Task Assigned",
            "message": "You have been assigned to 'Implement login page'",
            "link": "/tasks"
        },
        {
            "type": "mention",
            "title": "You were mentioned",
            "message": "@you Can you review this PR when you get a chance?",
            "link": "/tasks"
        },
        {
            "type": "comment",
            "title": "New Comment",
            "message": "Great progress! Let's discuss the next steps in our standup.",
            "link": "/tasks"
        },
        {
            "type": "reminder",
            "title": "Task Due Soon",
            "message": "'Dashboard UI Design' is due in 2 hours",
            "link": "/tasks"
        },
        {
            "type": "approval",
            "title": "Approval Request",
            "message": "Time off request needs your approval",
            "link": "/my-expense/approvals"
        },
        {
            "type": "system",
            "title": "System Update",
            "message": "New features have been added to the dashboard",
            "link": "/dashboard"
        }
    ]
    
    created = []
    for notif_data in sample_notifications:
        notification = Notification(
            user_id=current_user.id,
            type=notif_data["type"],
            title=notif_data["title"],
            message=notif_data["message"],
            link=notif_data["link"],
            is_read=False
        )
        db.add(notification)
        created.append(notification)
    
    db.commit()
    return {"message": f"Created {len(created)} sample notifications", "count": len(created)}
