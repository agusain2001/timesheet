"""Task Templates API router - Create and manage reusable task templates."""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.database import get_db
from app.models import User
from app.models.automation import TaskTemplate
from app.utils import get_current_active_user
from sqlalchemy.orm import Session
from sqlalchemy import desc
import uuid

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class TaskTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    task_type: Optional[str] = None
    priority: Optional[str] = "medium"
    status: Optional[str] = "todo"
    estimated_hours: Optional[float] = None
    default_project_id: Optional[str] = None
    default_assignee_id: Optional[str] = None
    checklist: Optional[List[str]] = None
    tags: Optional[List[str]] = None


class TaskTemplateUpdate(TaskTemplateCreate):
    pass


def _build_response(tpl: TaskTemplate) -> dict:
    return {
        "id": tpl.id,
        "name": tpl.name,
        "description": tpl.description,
        "task_type": getattr(tpl, "default_status", None),
        "priority": tpl.default_priority,
        "status": tpl.default_status,
        "estimated_hours": tpl.estimated_hours,
        "default_project_id": tpl.project_id,
        "default_assignee_id": None,
        "checklist": tpl.checklist or [],
        "tags": tpl.default_tags or [],
        "created_by": tpl.created_by_id or "",
        "created_at": tpl.created_at.isoformat() if tpl.created_at else "",
        "use_count": 0,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/")
def list_templates(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all task templates."""
    templates = db.query(TaskTemplate).filter(
        TaskTemplate.is_active == True
    ).order_by(desc(TaskTemplate.created_at)).offset(skip).limit(limit).all()
    return [_build_response(t) for t in templates]


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_template(
    data: TaskTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new task template."""
    template = TaskTemplate(
        id=str(uuid.uuid4()),
        name=data.name,
        description=data.description,
        task_name_template=data.name,
        task_description=data.description,
        default_priority=data.priority or "medium",
        default_status=data.status or "todo",
        estimated_hours=int(data.estimated_hours) if data.estimated_hours else None,
        checklist=data.checklist or [],
        default_tags=data.tags or [],
        project_id=data.default_project_id,
        is_active=True,
        created_by_id=str(current_user.id),
        created_at=datetime.utcnow(),
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return _build_response(template)


@router.get("/{template_id}")
def get_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a single task template."""
    tpl = db.query(TaskTemplate).filter(TaskTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return _build_response(tpl)


@router.put("/{template_id}")
def update_template(
    template_id: str,
    data: TaskTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a task template."""
    tpl = db.query(TaskTemplate).filter(TaskTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")

    if data.name is not None:
        tpl.name = data.name
        tpl.task_name_template = data.name
    if data.description is not None:
        tpl.description = data.description
        tpl.task_description = data.description
    if data.priority is not None:
        tpl.default_priority = data.priority
    if data.status is not None:
        tpl.default_status = data.status
    if data.estimated_hours is not None:
        tpl.estimated_hours = int(data.estimated_hours)
    if data.checklist is not None:
        tpl.checklist = data.checklist
    if data.tags is not None:
        tpl.default_tags = data.tags
    if data.default_project_id is not None:
        tpl.project_id = data.default_project_id

    tpl.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(tpl)
    return _build_response(tpl)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a task template."""
    tpl = db.query(TaskTemplate).filter(TaskTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(tpl)
    db.commit()


@router.post("/{template_id}/use")
def use_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Return template data for pre-filling a task form."""
    tpl = db.query(TaskTemplate).filter(TaskTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return _build_response(tpl)
