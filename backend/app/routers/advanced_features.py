"""Advanced features router - Templates, Saved Filters, Invites, MFA, Bulk Upload."""
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel, EmailStr
import csv
import io
import uuid
import secrets

from app.database import get_db
from app.models import User, Task, Project, TaskTemplate, ProjectTemplate
from app.models.templates import SavedFilter, UserInvite, ScheduledReport, MFASettings
from app.utils import get_current_active_user, get_password_hash
from app.services.email_service import email_service, EmailTemplates

router = APIRouter()


# ==================== SCHEMAS ====================

class UserInviteCreate(BaseModel):
    email: EmailStr
    role: str = "contributor"
    team_id: Optional[str] = None


class BulkUploadResult(BaseModel):
    total: int
    created: int
    failed: int
    errors: List[dict]


class TaskTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    default_priority: str = "medium"
    estimated_hours: Optional[str] = None
    default_tags: List[str] = []
    checklist_items: List[str] = []
    is_global: bool = False


class TaskTemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    default_priority: str
    estimated_hours: Optional[str]
    default_tags: List
    checklist_items: List

    class Config:
        from_attributes = True


class SavedFilterCreate(BaseModel):
    name: str
    description: Optional[str] = None
    entity_type: str
    filter_config: dict
    sort_config: dict = {}
    view_type: str = "list"
    is_shared: bool = False


class SavedFilterResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    entity_type: str
    filter_config: dict
    view_type: str
    is_shared: str
    share_token: Optional[str]

    class Config:
        from_attributes = True


class ScheduledReportCreate(BaseModel):
    name: str
    report_type: str
    report_config: dict = {}
    export_format: str = "pdf"
    schedule_type: str  # daily, weekly, monthly
    schedule_day: Optional[str] = None
    schedule_time: str = "09:00"
    recipients: List[dict] = []


# ==================== USER INVITES ====================

@router.post("/invites", response_model=dict)
async def invite_user(
    invite_data: UserInviteCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Send an email invitation to a new user."""
    # Check if user already exists
    existing = db.query(User).filter(User.email == invite_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Check for pending invite
    pending = db.query(UserInvite).filter(
        UserInvite.email == invite_data.email,
        UserInvite.status == "pending"
    ).first()
    if pending:
        raise HTTPException(status_code=400, detail="Invitation already pending for this email")
    
    # Create invite
    token = secrets.token_urlsafe(32)
    invite = UserInvite(
        email=invite_data.email,
        token=token,
        role=invite_data.role,
        team_id=invite_data.team_id,
        invited_by_id=current_user.id,
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(invite)
    db.commit()
    
    # Send invitation email
    invite_url = f"/register?token={token}"
    html_content = f"""
    <h2>You're Invited!</h2>
    <p><strong>{current_user.full_name}</strong> has invited you to join TimeSheet.</p>
    <p>Click the link below to create your account:</p>
    <a href="{invite_url}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Accept Invitation</a>
    <p>This invitation expires in 7 days.</p>
    """
    html = EmailTemplates.base_template(html_content, "You're Invited to TimeSheet")
    
    background_tasks.add_task(
        email_service.send_email,
        invite_data.email,
        "You're Invited to TimeSheet",
        html
    )
    
    return {"message": "Invitation sent successfully", "invite_id": invite.id}


@router.post("/invites/bulk", response_model=BulkUploadResult)
async def bulk_invite_users(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Bulk invite users via CSV upload."""
    if current_user.role not in ["admin", "system_admin", "org_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    content = await file.read()
    decoded = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))
    
    result = BulkUploadResult(total=0, created=0, failed=0, errors=[])
    
    for row in reader:
        result.total += 1
        try:
            email = row.get("email", "").strip()
            if not email:
                raise ValueError("Email is required")
            
            # Check if exists
            if db.query(User).filter(User.email == email).first():
                raise ValueError("User already exists")
            
            # Create invite
            token = secrets.token_urlsafe(32)
            invite = UserInvite(
                email=email,
                token=token,
                role=row.get("role", "contributor"),
                invited_by_id=current_user.id,
                expires_at=datetime.utcnow() + timedelta(days=7)
            )
            db.add(invite)
            result.created += 1
            
        except Exception as e:
            result.failed += 1
            result.errors.append({"row": result.total, "email": row.get("email"), "error": str(e)})
    
    db.commit()
    return result


@router.post("/users/bulk-upload", response_model=BulkUploadResult)
async def bulk_create_users(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Bulk create users via CSV upload (direct creation, no invite)."""
    if current_user.role not in ["admin", "system_admin", "org_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    content = await file.read()
    decoded = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))
    
    result = BulkUploadResult(total=0, created=0, failed=0, errors=[])
    
    for row in reader:
        result.total += 1
        try:
            email = row.get("email", "").strip()
            full_name = row.get("full_name", row.get("name", "")).strip()
            password = row.get("password", secrets.token_urlsafe(12))
            
            if not email or not full_name:
                raise ValueError("Email and full_name are required")
            
            if db.query(User).filter(User.email == email).first():
                raise ValueError("User already exists")
            
            user = User(
                email=email,
                full_name=full_name,
                password_hash=get_password_hash(password),
                role=row.get("role", "employee"),
                position=row.get("position", row.get("job_title")),
                phone=row.get("phone"),
                skills=row.get("skills", "").split(",") if row.get("skills") else None,
                timezone=row.get("timezone", "Africa/Cairo")
            )
            db.add(user)
            result.created += 1
            
        except Exception as e:
            result.failed += 1
            result.errors.append({"row": result.total, "email": row.get("email"), "error": str(e)})
    
    db.commit()
    return result


# ==================== TASK TEMPLATES ====================

@router.get("/templates/tasks", response_model=List[TaskTemplateResponse])
def get_task_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all task templates available to the user."""
    templates = db.query(TaskTemplate).filter(
        or_(
            TaskTemplate.created_by_id == current_user.id,
            TaskTemplate.is_global == "true"
        )
    ).all()
    return templates


@router.post("/templates/tasks", response_model=TaskTemplateResponse)
def create_task_template(
    template_data: TaskTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new task template."""
    template = TaskTemplate(
        name=template_data.name,
        description=template_data.description,
        default_priority=template_data.default_priority,
        estimated_hours=template_data.estimated_hours,
        default_tags=template_data.default_tags,
        checklist_items=template_data.checklist_items,
        is_global="true" if template_data.is_global else "false",
        created_by_id=current_user.id
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.post("/tasks/from-template/{template_id}")
def create_task_from_template(
    template_id: str,
    project_id: Optional[str] = None,
    assignee_id: Optional[str] = None,
    due_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new task from a template."""
    template = db.query(TaskTemplate).filter(TaskTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    task = Task(
        name=template.name,
        description=template.description,
        priority=template.default_priority,
        status="todo",
        project_id=project_id,
        assignee_id=assignee_id,
        created_by_id=current_user.id,
        estimated_hours=float(template.estimated_hours) if template.estimated_hours else None,
        tags=template.default_tags,
        due_date=datetime.fromisoformat(due_date) if due_date else None
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    
    return {"id": task.id, "name": task.name, "message": "Task created from template"}


# ==================== SAVED FILTERS ====================

@router.get("/filters", response_model=List[SavedFilterResponse])
def get_saved_filters(
    entity_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get user's saved filters."""
    query = db.query(SavedFilter).filter(SavedFilter.user_id == current_user.id)
    if entity_type:
        query = query.filter(SavedFilter.entity_type == entity_type)
    return query.all()


@router.post("/filters", response_model=SavedFilterResponse)
def create_saved_filter(
    filter_data: SavedFilterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new saved filter."""
    share_token = secrets.token_urlsafe(16) if filter_data.is_shared else None
    
    saved_filter = SavedFilter(
        name=filter_data.name,
        description=filter_data.description,
        entity_type=filter_data.entity_type,
        filter_config=filter_data.filter_config,
        sort_config=filter_data.sort_config,
        view_type=filter_data.view_type,
        is_shared="true" if filter_data.is_shared else "false",
        share_token=share_token,
        user_id=current_user.id
    )
    db.add(saved_filter)
    db.commit()
    db.refresh(saved_filter)
    return saved_filter


@router.delete("/filters/{filter_id}")
def delete_saved_filter(
    filter_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a saved filter."""
    saved_filter = db.query(SavedFilter).filter(
        SavedFilter.id == filter_id,
        SavedFilter.user_id == current_user.id
    ).first()
    if not saved_filter:
        raise HTTPException(status_code=404, detail="Filter not found")
    
    db.delete(saved_filter)
    db.commit()
    return {"message": "Filter deleted"}


@router.get("/filters/shared/{share_token}")
def get_shared_filter(
    share_token: str,
    db: Session = Depends(get_db)
):
    """Get a shared filter by token (public access)."""
    saved_filter = db.query(SavedFilter).filter(
        SavedFilter.share_token == share_token,
        SavedFilter.is_shared == "true"
    ).first()
    if not saved_filter:
        raise HTTPException(status_code=404, detail="Shared filter not found")
    
    return {
        "name": saved_filter.name,
        "entity_type": saved_filter.entity_type,
        "filter_config": saved_filter.filter_config,
        "view_type": saved_filter.view_type
    }


# ==================== SCHEDULED REPORTS ====================

@router.get("/scheduled-reports")
def get_scheduled_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get user's scheduled reports."""
    reports = db.query(ScheduledReport).filter(
        ScheduledReport.created_by_id == current_user.id
    ).all()
    return reports


@router.post("/scheduled-reports")
def create_scheduled_report(
    report_data: ScheduledReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new scheduled report."""
    report = ScheduledReport(
        name=report_data.name,
        report_type=report_data.report_type,
        report_config=report_data.report_config,
        export_format=report_data.export_format,
        schedule_type=report_data.schedule_type,
        schedule_day=report_data.schedule_day,
        schedule_time=report_data.schedule_time,
        recipients=report_data.recipients,
        created_by_id=current_user.id
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return {"id": report.id, "name": report.name, "message": "Scheduled report created"}


@router.delete("/scheduled-reports/{report_id}")
def delete_scheduled_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a scheduled report."""
    report = db.query(ScheduledReport).filter(
        ScheduledReport.id == report_id,
        ScheduledReport.created_by_id == current_user.id
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    db.delete(report)
    db.commit()
    return {"message": "Scheduled report deleted"}


# ==================== GDPR DATA EXPORT ====================

@router.get("/gdpr/export")
async def export_user_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Export all user data for GDPR compliance."""
    user_data = {
        "personal_info": {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "position": current_user.position,
            "phone": current_user.phone,
            "skills": current_user.skills,
            "timezone": current_user.timezone,
            "created_at": str(current_user.created_at),
        },
        "tasks": [],
        "timesheets": [],
        "comments": []
    }
    
    # Get user's tasks
    tasks = db.query(Task).filter(Task.assignee_id == current_user.id).all()
    for task in tasks:
        user_data["tasks"].append({
            "id": task.id,
            "name": task.name,
            "status": task.status,
            "created_at": str(task.created_at)
        })
    
    # Get user's timesheets
    from app.models import Timesheet
    timesheets = db.query(Timesheet).filter(Timesheet.user_id == current_user.id).all()
    for ts in timesheets:
        user_data["timesheets"].append({
            "id": ts.id,
            "date": str(ts.date),
            "hours": ts.total_hours,
            "status": ts.status
        })
    
    return user_data
