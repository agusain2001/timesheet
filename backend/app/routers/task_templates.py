"""Task Templates API router - Create and manage reusable task templates."""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.database import get_db
from app.models import User
from app.utils import get_current_active_user
from sqlalchemy.orm import Session
import uuid
import json

router = APIRouter()

# ── In-memory template store (lightweight, no extra migration needed) ──────────
# In production this would be a proper DB table. For now it's per-process memory.
_templates: dict[str, dict] = {}


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


class TaskTemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    task_type: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    estimated_hours: Optional[float] = None
    default_project_id: Optional[str] = None
    default_assignee_id: Optional[str] = None
    checklist: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    created_by: str
    created_at: str
    use_count: int = 0


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[TaskTemplateResponse])
def list_templates(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all task templates."""
    templates = list(_templates.values())
    templates.sort(key=lambda t: t.get("created_at", ""), reverse=True)
    return [TaskTemplateResponse(**t) for t in templates[skip: skip + limit]]


@router.post("/", response_model=TaskTemplateResponse)
def create_template(
    data: TaskTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new task template."""
    template_id = str(uuid.uuid4())
    template = {
        "id": template_id,
        "name": data.name,
        "description": data.description,
        "task_type": data.task_type,
        "priority": data.priority or "medium",
        "status": data.status or "todo",
        "estimated_hours": data.estimated_hours,
        "default_project_id": data.default_project_id,
        "default_assignee_id": data.default_assignee_id,
        "checklist": data.checklist or [],
        "tags": data.tags or [],
        "created_by": str(current_user.id),
        "created_at": datetime.utcnow().isoformat(),
        "use_count": 0,
    }
    _templates[template_id] = template
    return TaskTemplateResponse(**template)


@router.get("/{template_id}", response_model=TaskTemplateResponse)
def get_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a single task template."""
    if template_id not in _templates:
        raise HTTPException(status_code=404, detail="Template not found")
    return TaskTemplateResponse(**_templates[template_id])


@router.put("/{template_id}", response_model=TaskTemplateResponse)
def update_template(
    template_id: str,
    data: TaskTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a task template."""
    if template_id not in _templates:
        raise HTTPException(status_code=404, detail="Template not found")
    template = _templates[template_id]
    update_data = data.dict(exclude_unset=True)
    template.update(update_data)
    _templates[template_id] = template
    return TaskTemplateResponse(**template)


@router.delete("/{template_id}")
def delete_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a task template."""
    if template_id not in _templates:
        raise HTTPException(status_code=404, detail="Template not found")
    del _templates[template_id]
    return {"success": True}


@router.post("/{template_id}/use", response_model=TaskTemplateResponse)
def use_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Increment use count and return template data for pre-filling a task form."""
    if template_id not in _templates:
        raise HTTPException(status_code=404, detail="Template not found")
    _templates[template_id]["use_count"] = _templates[template_id].get("use_count", 0) + 1
    return TaskTemplateResponse(**_templates[template_id])
