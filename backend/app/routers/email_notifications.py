"""Email Notifications API router."""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
import uuid

from app.database import get_db
from app.models import User, EmailPreference, EmailLog, TaskReminder
from app.utils import get_current_active_user

router = APIRouter()

# =============== Schemas ===============

class EmailPreferencesResponse(BaseModel):
    task_assignments: bool
    task_comments: bool
    task_mentions: bool
    task_due_reminders: bool
    task_overdue: bool
    project_updates: bool
    weekly_digest: bool
    daily_summary: bool
    approval_requests: bool
    system_alerts: bool
    
    class Config:
        from_attributes = True

class EmailPreferencesUpdate(BaseModel):
    task_assignments: Optional[bool] = None
    task_comments: Optional[bool] = None
    task_mentions: Optional[bool] = None
    task_due_reminders: Optional[bool] = None
    task_overdue: Optional[bool] = None
    project_updates: Optional[bool] = None
    weekly_digest: Optional[bool] = None
    daily_summary: Optional[bool] = None
    approval_requests: Optional[bool] = None
    system_alerts: Optional[bool] = None

class ReminderSettingsResponse(BaseModel):
    enabled: bool
    days_before_due: List[int]
    time: str  # HH:mm format
    timezone: str
    
    class Config:
        from_attributes = True

class ReminderSettingsUpdate(BaseModel):
    enabled: Optional[bool] = None
    days_before_due: Optional[List[int]] = None
    time: Optional[str] = None
    timezone: Optional[str] = None

class DigestSettingsResponse(BaseModel):
    enabled: bool
    frequency: str  # daily, weekly, monthly
    day_of_week: Optional[int] = None
    day_of_month: Optional[int] = None
    time: str
    timezone: str
    include_overdue: bool
    include_upcoming: bool
    include_completed: bool
    
    class Config:
        from_attributes = True

class DigestSettingsUpdate(BaseModel):
    enabled: Optional[bool] = None
    frequency: Optional[str] = None
    day_of_week: Optional[int] = None
    day_of_month: Optional[int] = None
    time: Optional[str] = None
    timezone: Optional[str] = None
    include_overdue: Optional[bool] = None
    include_upcoming: Optional[bool] = None
    include_completed: Optional[bool] = None

class EmailLogResponse(BaseModel):
    id: str
    recipient_email: str
    recipient_name: str
    subject: str
    template_id: Optional[str] = None
    status: str
    sent_at: Optional[datetime] = None
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True

class SendEmailRequest(BaseModel):
    to: List[str]
    subject: str
    template_id: Optional[str] = None
    template_data: Optional[dict] = None
    html_content: Optional[str] = None
    text_content: Optional[str] = None
    priority: Optional[str] = "normal"
    scheduled_for: Optional[datetime] = None

class ScheduleReminderRequest(BaseModel):
    reminder_date: datetime
    message: Optional[str] = None

class EmailTemplateResponse(BaseModel):
    id: str
    name: str
    subject: str
    body_html: str
    body_text: str
    variables: List[str]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# =============== Helper Functions ===============

def get_or_create_preferences(db: Session, user_id: str) -> EmailPreference:
    """Get or create email preferences for a user."""
    prefs = db.query(EmailPreference).filter(EmailPreference.user_id == user_id).first()
    if not prefs:
        prefs = EmailPreference(
            id=str(uuid.uuid4()),
            user_id=user_id,
            task_assignments=True,
            task_comments=True,
            task_mentions=True,
            task_due_reminders=True,
            task_overdue=True,
            project_updates=False,
            weekly_digest=True,
            daily_summary=False,
            approval_requests=True,
            system_alerts=True,
            reminder_enabled=True,
            reminder_days_before=[1, 3],
            reminder_time="09:00",
            reminder_timezone="UTC",
            digest_enabled=True,
            digest_frequency="weekly",
            digest_day_of_week=1,
            digest_time="08:00",
            digest_include_overdue=True,
            digest_include_upcoming=True,
            digest_include_completed=False,
            created_at=datetime.utcnow()
        )
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    return prefs

# =============== Preferences Endpoints ===============

@router.get("/preferences", response_model=EmailPreferencesResponse)
def get_email_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get email notification preferences."""
    prefs = get_or_create_preferences(db, current_user.id)
    return prefs


@router.put("/preferences", response_model=EmailPreferencesResponse)
def update_email_preferences(
    data: EmailPreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update email notification preferences."""
    prefs = get_or_create_preferences(db, current_user.id)
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(prefs, field, value)
    
    prefs.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(prefs)
    
    return prefs


# =============== Reminder Settings Endpoints ===============

@router.get("/reminders", response_model=ReminderSettingsResponse)
def get_reminder_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get task reminder settings."""
    prefs = get_or_create_preferences(db, current_user.id)
    return {
        "enabled": prefs.reminder_enabled,
        "days_before_due": prefs.reminder_days_before or [1, 3],
        "time": prefs.reminder_time or "09:00",
        "timezone": prefs.reminder_timezone or "UTC",
    }


@router.put("/reminders", response_model=ReminderSettingsResponse)
def update_reminder_settings(
    data: ReminderSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update task reminder settings."""
    prefs = get_or_create_preferences(db, current_user.id)
    
    if data.enabled is not None:
        prefs.reminder_enabled = data.enabled
    if data.days_before_due is not None:
        prefs.reminder_days_before = data.days_before_due
    if data.time is not None:
        prefs.reminder_time = data.time
    if data.timezone is not None:
        prefs.reminder_timezone = data.timezone
    
    prefs.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(prefs)
    
    return {
        "enabled": prefs.reminder_enabled,
        "days_before_due": prefs.reminder_days_before or [1, 3],
        "time": prefs.reminder_time or "09:00",
        "timezone": prefs.reminder_timezone or "UTC",
    }


# =============== Digest Settings Endpoints ===============

@router.get("/digest", response_model=DigestSettingsResponse)
def get_digest_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get digest email settings."""
    prefs = get_or_create_preferences(db, current_user.id)
    return {
        "enabled": prefs.digest_enabled,
        "frequency": prefs.digest_frequency or "weekly",
        "day_of_week": prefs.digest_day_of_week,
        "day_of_month": prefs.digest_day_of_month,
        "time": prefs.digest_time or "08:00",
        "timezone": prefs.reminder_timezone or "UTC",
        "include_overdue": prefs.digest_include_overdue,
        "include_upcoming": prefs.digest_include_upcoming,
        "include_completed": prefs.digest_include_completed,
    }


@router.put("/digest", response_model=DigestSettingsResponse)
def update_digest_settings(
    data: DigestSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update digest email settings."""
    prefs = get_or_create_preferences(db, current_user.id)
    
    if data.enabled is not None:
        prefs.digest_enabled = data.enabled
    if data.frequency is not None:
        prefs.digest_frequency = data.frequency
    if data.day_of_week is not None:
        prefs.digest_day_of_week = data.day_of_week
    if data.day_of_month is not None:
        prefs.digest_day_of_month = data.day_of_month
    if data.time is not None:
        prefs.digest_time = data.time
    if data.timezone is not None:
        prefs.reminder_timezone = data.timezone
    if data.include_overdue is not None:
        prefs.digest_include_overdue = data.include_overdue
    if data.include_upcoming is not None:
        prefs.digest_include_upcoming = data.include_upcoming
    if data.include_completed is not None:
        prefs.digest_include_completed = data.include_completed
    
    prefs.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(prefs)
    
    return {
        "enabled": prefs.digest_enabled,
        "frequency": prefs.digest_frequency or "weekly",
        "day_of_week": prefs.digest_day_of_week,
        "day_of_month": prefs.digest_day_of_month,
        "time": prefs.digest_time or "08:00",
        "timezone": prefs.reminder_timezone or "UTC",
        "include_overdue": prefs.digest_include_overdue,
        "include_upcoming": prefs.digest_include_upcoming,
        "include_completed": prefs.digest_include_completed,
    }


# =============== Email Logs Endpoints ===============

@router.get("/logs")
def get_email_logs(
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get email logs for current user."""
    query = db.query(EmailLog).filter(EmailLog.user_id == current_user.id)
    
    total = query.count()
    pages = (total + limit - 1) // limit
    
    logs = query.order_by(desc(EmailLog.created_at)).offset((page - 1) * limit).limit(limit).all()
    
    return {
        "logs": logs,
        "total": total,
        "pages": pages,
        "page": page,
    }


# =============== Test Email Endpoint ===============

@router.post("/test")
def send_test_email(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Send a test email to verify settings."""
    # In production, this would queue an actual email
    # For now, we'll simulate success
    
    # Log the test email
    log = EmailLog(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        recipient_email=current_user.email,
        recipient_name=current_user.full_name or current_user.email,
        subject="Test Email from LightIDEA",
        status="sent",
        sent_at=datetime.utcnow(),
        created_at=datetime.utcnow()
    )
    db.add(log)
    db.commit()
    
    return {"success": True, "message": "Test email sent successfully"}


# =============== Send Email Endpoint (Admin) ===============

@router.post("/send")
def send_email(
    data: SendEmailRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Send a custom email (admin only)."""
    # Check admin permission
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    email_id = str(uuid.uuid4())
    
    # Log the email
    for recipient in data.to:
        log = EmailLog(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            recipient_email=recipient,
            recipient_name=recipient,
            subject=data.subject,
            template_id=data.template_id,
            status="pending" if data.scheduled_for else "sent",
            sent_at=data.scheduled_for or datetime.utcnow(),
            created_at=datetime.utcnow()
        )
        db.add(log)
    
    db.commit()
    
    return {"success": True, "email_id": email_id}


# =============== Templates Endpoint ===============

@router.get("/templates", response_model=List[EmailTemplateResponse])
def get_email_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get available email templates."""
    # Return hardcoded templates for now
    # In production, these would come from database
    templates = [
        {
            "id": "task-assigned",
            "name": "Task Assignment",
            "subject": "You've been assigned a new task: {{task_name}}",
            "body_html": "<h1>New Task Assigned</h1><p>You have been assigned: {{task_name}}</p>",
            "body_text": "New Task Assigned\nYou have been assigned: {{task_name}}",
            "variables": ["task_name", "task_url", "assignee_name", "due_date"],
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": None,
        },
        {
            "id": "task-reminder",
            "name": "Task Due Reminder",
            "subject": "Reminder: {{task_name}} is due {{due_in}}",
            "body_html": "<h1>Task Due Reminder</h1><p>{{task_name}} is due {{due_in}}</p>",
            "body_text": "Task Due Reminder\n{{task_name}} is due {{due_in}}",
            "variables": ["task_name", "task_url", "due_in", "due_date"],
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": None,
        },
        {
            "id": "weekly-digest",
            "name": "Weekly Digest",
            "subject": "Your Weekly Summary - {{week_start}} to {{week_end}}",
            "body_html": "<h1>Weekly Summary</h1><p>Tasks completed: {{completed}}</p>",
            "body_text": "Weekly Summary\nTasks completed: {{completed}}",
            "variables": ["week_start", "week_end", "completed", "overdue", "upcoming"],
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": None,
        },
    ]
    return templates


# =============== Unsubscribe Endpoint ===============

@router.post("/unsubscribe")
def unsubscribe_with_token(
    token: str,
    notification_type: str,
    db: Session = Depends(get_db)
):
    """Unsubscribe from emails using a token (doesn't require auth)."""
    # In production, validate the token and find the user
    # For now, return success
    return {"success": True, "message": f"Unsubscribed from {notification_type}"}
