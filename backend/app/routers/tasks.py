"""Tasks router — full CRUD with role-based access control and dependency enforcement."""
from typing import List, Optional
from datetime import datetime, date
import os, uuid, shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.database import get_db
from app.models import Task, User, Project, Client, TaskStatus, TaskDependency
from app.schemas import TaskCreate, TaskUpdate, TaskResponse, ProjectBrief, ClientBrief, UserBrief
from app.utils import (
    get_current_active_user,
    is_manager,
    can_modify_task,
    can_delete_task,
    ForbiddenError,
    NotFoundError,
    DependencyBlockedError,
)
from app.utils.tenant import scope_to_org, set_org_id, is_super_admin
from app.services.notification_service import NotificationService
from app.services.automation_engine import run_automation_rules

router = APIRouter()


# ─── Helpers ─────────────────────────────────────────────────────────────────

def build_task_response(task: Task, db: Session) -> dict:
    """Build task response with project, client, and assignee info."""
    project_data = None
    client_data = None
    assignee_data = None

    if task.project:
        project_data = ProjectBrief(
            id=task.project.id,
            name=task.project.name,
            client_id=task.project.client_id,
            status=task.project.status or "active"
        )
        if task.project.client_id:
            client = db.query(Client).filter(Client.id == task.project.client_id).first()
            if client:
                client_data = ClientBrief(id=client.id, name=client.name, alias=client.alias)

    if task.assignee:
        assignee_data = UserBrief(
            id=task.assignee.id,
            full_name=task.assignee.full_name,
            email=task.assignee.email,
            avatar_url=task.assignee.avatar_url
        )

    # Fetch blocking dependencies
    blocking = db.query(TaskDependency).filter(
        TaskDependency.successor_id == task.id,
        TaskDependency.is_blocking == True
    ).all()
    blocked_by = []
    for dep in blocking:
        pred = dep.predecessor
        if pred and pred.status not in (TaskStatus.COMPLETED.value, TaskStatus.CANCELLED.value):
            blocked_by.append({"id": pred.id, "name": pred.name, "status": pred.status})

    return {
        "id": task.id,
        "name": task.name,
        "description": task.description,
        "task_type": task.task_type,
        "project_id": task.project_id,
        "department_id": task.department_id,
        "team_id": task.team_id,
        "assignee_id": task.assignee_id,
        "owner_id": task.owner_id,
        "priority": task.priority,
        "estimated_hours": task.estimated_hours,
        "actual_hours": task.actual_hours,
        "tags": task.tags or [],
        "start_date": task.start_date,
        "due_date": task.due_date,
        "status": task.status,
        "created_at": task.created_at,
        "completed_at": task.completed_at,
        "project": project_data,
        "client": client_data,
        "assignee": assignee_data,
        "blocked_by": blocked_by,
        "is_blocked": len(blocked_by) > 0,
    }


def _check_dependency_block(task: Task, new_status: str, db: Session):
    """
    Raise DependencyBlockedError if task cannot transition to new_status
    because it has unfinished blocking predecessors.
    """
    active_statuses = {
        TaskStatus.IN_PROGRESS.value,
        TaskStatus.REVIEW.value,
        TaskStatus.COMPLETED.value,
    }
    if new_status not in active_statuses:
        return  # Only check when trying to make progress

    blocking_deps = db.query(TaskDependency).filter(
        TaskDependency.successor_id == task.id,
        TaskDependency.is_blocking == True
    ).all()

    blocked_by = []
    for dep in blocking_deps:
        pred = dep.predecessor
        if pred and pred.status not in (TaskStatus.COMPLETED.value, TaskStatus.CANCELLED.value):
            blocked_by.append({"id": pred.id, "name": pred.name, "status": pred.status})

    if blocked_by:
        raise DependencyBlockedError(blocked_by)


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[TaskResponse])
def get_all_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    project_id: Optional[str] = None,
    department_id: Optional[str] = None,
    team_id: Optional[str] = None,
    assignee_id: Optional[str] = None,
    task_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    parent_task_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get tasks. Managers see all in their org; others see only their own or assigned tasks."""
    query = db.query(Task)
    # Tenant isolation
    query = scope_to_org(query, Task, current_user)

    # Non-managers only see tasks they are involved in (unless filtering by project etc.)
    if not is_manager(current_user) and not project_id and not team_id:
        query = query.filter(
            (Task.assignee_id == current_user.id) |
            (Task.owner_id == current_user.id)
        )

    if project_id:
        query = query.filter(Task.project_id == project_id)
    if department_id:
        query = query.filter(Task.department_id == department_id)
    if team_id:
        query = query.filter(Task.team_id == team_id)
    if assignee_id:
        query = query.filter(Task.assignee_id == assignee_id)
    if task_type:
        query = query.filter(Task.task_type == task_type)
    if status_filter:
        query = query.filter(Task.status == status_filter)
    if priority:
        query = query.filter(Task.priority == priority)
    if search:
        query = query.filter(Task.name.ilike(f"%{search}%"))
    # Subtask filter — returns only children of this task
    if parent_task_id:
        query = query.filter(Task.parent_task_id == parent_task_id)
    else:
        # By default, only return root tasks (no subtask flooding in task list)
        # Unless parent_task_id is explicitly requested, skip tasks that have a parent
        pass  # Don't auto-hide subtasks — keep legacy behavior

    tasks = query.order_by(Task.created_at.desc()).offset(skip).limit(limit).all()
    return [build_task_response(t, db) for t in tasks]


@router.get("/my", response_model=List[TaskResponse])
def get_my_tasks(
    task_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    active_only: bool = False,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = Query(200, ge=1, le=500),
    search: Optional[str] = None,
    priority: Optional[str] = None,
    assignee_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's tasks, with optional date-range, status, and text filters."""
    query = db.query(Task).filter(Task.assignee_id == current_user.id)

    if task_type:
        query = query.filter(Task.task_type == task_type)
    if status_filter:
        query = query.filter(Task.status == status_filter)
    if priority:
        query = query.filter(Task.priority == priority)
    if assignee_id:
        query = query.filter(Task.assignee_id == assignee_id)
    if search:
        query = query.filter(Task.name.ilike(f"%{search}%"))
    if active_only:
        query = query.filter(
            Task.status.notin_([
                TaskStatus.COMPLETED.value,
                TaskStatus.OVERDUE.value,
                TaskStatus.CANCELLED.value
            ])
        )

    # Date-range filter — include tasks whose due_date OR created_at falls within the window
    if start_date:
        effective_end = end_date or start_date
        filter_start = datetime.combine(start_date, datetime.min.time())
        filter_end = datetime.combine(effective_end, datetime.max.time())
        query = query.filter(
            or_(
                and_(Task.due_date >= filter_start, Task.due_date <= filter_end),
                and_(Task.created_at >= filter_start, Task.created_at <= filter_end),
            )
        )

    tasks = query.order_by(Task.due_date.asc().nullslast()).limit(limit).all()
    return [build_task_response(t, db) for t in tasks]



@router.get("/stats", response_model=dict)
def get_task_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get task statistics for the current user."""
    base = db.query(Task).filter(Task.assignee_id == current_user.id)
    now = datetime.utcnow()

    return {
        "total": base.count(),
        "by_status": {
            "todo": base.filter(Task.status == TaskStatus.TODO.value).count(),
            "in_progress": base.filter(Task.status == TaskStatus.IN_PROGRESS.value).count(),
            "review": base.filter(Task.status == TaskStatus.REVIEW.value).count(),
            "completed": base.filter(Task.status == TaskStatus.COMPLETED.value).count(),
            "blocked": base.filter(Task.status == TaskStatus.BLOCKED.value).count(),
            "cancelled": base.filter(Task.status == TaskStatus.CANCELLED.value).count(),
        },
        "overdue": base.filter(
            Task.due_date < now,
            Task.status.notin_([TaskStatus.COMPLETED.value, TaskStatus.CANCELLED.value])
        ).count(),
        "due_today": base.filter(
            Task.due_date >= now.replace(hour=0, minute=0, second=0),
            Task.due_date <= now.replace(hour=23, minute=59, second=59),
            Task.status.notin_([TaskStatus.COMPLETED.value, TaskStatus.CANCELLED.value])
        ).count(),
    }


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new task."""
    task_dict = task_data.model_dump(exclude_unset=True)
    task_dict["owner_id"] = current_user.id

    db_task = Task(**task_dict)

    # Auto-assign personal tasks to creator
    if not db_task.assignee_id and task_data.task_type == "personal":
        db_task.assignee_id = current_user.id

    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    # Notify assignee if different from creator
    if db_task.assignee_id and db_task.assignee_id != current_user.id:
        NotificationService.notify_task_assigned(
            db=db,
            assignee_id=db_task.assignee_id,
            task_name=db_task.name,
            task_id=db_task.id,
            assigner_name=current_user.full_name
        )

    # Run automation rules for task_created event
    run_automation_rules(db_task, "task_created", db, actor_id=str(current_user.id))

    return build_task_response(db_task, db)


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific task by ID."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise NotFoundError("Task", task_id)
    return build_task_response(task, db)


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: str,
    task_data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a task. Enforces role-based edit rights and dependency blocking."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise NotFoundError("Task", task_id)

    if not can_modify_task(task, current_user):
        raise ForbiddenError("modify this task")

    update_data = task_data.model_dump(exclude_unset=True)
    old_assignee_id = task.assignee_id
    old_status = task.status

    # ── Dependency Blocking Check ──────────────────────────────────────────
    if "status" in update_data and update_data["status"] != old_status:
        _check_dependency_block(task, update_data["status"], db)

    # ── Completion timestamp ───────────────────────────────────────────────
    if "status" in update_data and update_data["status"] == TaskStatus.COMPLETED.value:
        task.completed_at = datetime.utcnow()
    elif "status" in update_data and update_data["status"] != TaskStatus.COMPLETED.value:
        task.completed_at = None  # Reset if un-completing

    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)

    # ── Notifications ──────────────────────────────────────────────────────
    if "assignee_id" in update_data and task.assignee_id != old_assignee_id:
        if task.assignee_id and task.assignee_id != current_user.id:
            NotificationService.notify_task_assigned(
                db=db,
                assignee_id=task.assignee_id,
                task_name=task.name,
                task_id=task.id,
                assigner_name=current_user.full_name
            )

    # Run automation rules for task_updated (or status_changed)
    event = "status_changed" if "status" in update_data else "task_updated"
    run_automation_rules(task, event, db, actor_id=str(current_user.id))

    return build_task_response(task, db)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a task. Only task owners and managers can delete within their org."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise NotFoundError("Task", task_id)

    if not is_super_admin(current_user):
        if not can_delete_task(task, current_user):
            raise ForbiddenError("delete this task")

    db.delete(task)
    db.commit()
    return None


# ─── Task Dependencies ────────────────────────────────────────────────────────

@router.post("/{task_id}/dependencies", status_code=status.HTTP_201_CREATED)
def add_dependency(
    task_id: str,
    predecessor_id: str,
    dependency_type: str = "FS",
    is_blocking: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add a task dependency (predecessor → task_id)."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise NotFoundError("Task", task_id)

    predecessor = db.query(Task).filter(Task.id == predecessor_id).first()
    if not predecessor:
        raise NotFoundError("Predecessor task", predecessor_id)

    if not can_modify_task(task, current_user):
        raise ForbiddenError("add dependencies to this task")

    # Check for circular dependency
    if predecessor_id == task_id:
        raise HTTPException(status_code=400, detail="A task cannot depend on itself")

    existing = db.query(TaskDependency).filter(
        TaskDependency.predecessor_id == predecessor_id,
        TaskDependency.successor_id == task_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Dependency already exists")

    dep = TaskDependency(
        predecessor_id=predecessor_id,
        successor_id=task_id,
        dependency_type=dependency_type,
        is_blocking=is_blocking
    )
    db.add(dep)
    db.commit()
    return {"message": "Dependency added", "predecessor_id": predecessor_id, "successor_id": task_id}


@router.delete("/{task_id}/dependencies/{predecessor_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_dependency(
    task_id: str,
    predecessor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Remove a task dependency."""
    dep = db.query(TaskDependency).filter(
        TaskDependency.predecessor_id == predecessor_id,
        TaskDependency.successor_id == task_id
    ).first()
    if not dep:
        raise NotFoundError("Dependency")

    task = db.query(Task).filter(Task.id == task_id).first()
    if task and not can_modify_task(task, current_user):
        raise ForbiddenError("remove dependencies from this task")

    db.delete(dep)
    db.commit()
    return None


@router.get("/{task_id}/dependencies")
def get_dependencies(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all dependencies for a task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise NotFoundError("Task", task_id)

    predecessors = db.query(TaskDependency).filter(
        TaskDependency.successor_id == task_id
    ).all()
    successors = db.query(TaskDependency).filter(
        TaskDependency.predecessor_id == task_id
    ).all()

    return {
        "blocking_predecessors": [
            {
                "id": dep.predecessor.id,
                "name": dep.predecessor.name,
                "status": dep.predecessor.status,
                "dependency_type": dep.dependency_type,
                "is_blocking": dep.is_blocking,
            }
            for dep in predecessors if dep.predecessor
        ],
        "dependent_successors": [
            {
                "id": dep.successor.id,
                "name": dep.successor.name,
                "status": dep.successor.status,
                "dependency_type": dep.dependency_type,
                "is_blocking": dep.is_blocking,
            }
            for dep in successors if dep.successor
        ],
    }


# ─── File Attachments ─────────────────────────────────────────────────────────

# In-memory attachment store (keyed by task_id → list of attachment dicts)
# In production this would be a database table.
_attachments: dict = {}
ATTACHMENTS_DIR = Path("uploads/attachments")
ATTACHMENTS_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE_MB = 20
ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp",
    ".zip", ".tar", ".gz",
    ".txt", ".md", ".csv", ".json",
}


@router.get("/{task_id}/attachments")
def list_attachments(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all file attachments for a task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _attachments.get(task_id, [])


@router.post("/{task_id}/attachments")
async def upload_attachment(
    task_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Upload a file attachment to a task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Validate extension
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type '{ext}' not allowed")

    # Read and check size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File too large (max {MAX_FILE_SIZE_MB}MB)")

    # Save file
    task_dir = ATTACHMENTS_DIR / task_id
    task_dir.mkdir(parents=True, exist_ok=True)
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = task_dir / unique_name

    with open(file_path, "wb") as f:
        f.write(content)

    attachment = {
        "id": unique_name,
        "filename": file.filename,
        "stored_name": unique_name,
        "size": len(content),
        "content_type": file.content_type or "application/octet-stream",
        "uploaded_by": current_user.full_name or current_user.email,
        "uploaded_at": datetime.utcnow().isoformat(),
        "url": f"/api/uploads/attachments/{task_id}/{unique_name}",
    }

    if task_id not in _attachments:
        _attachments[task_id] = []
    _attachments[task_id].append(attachment)

    return attachment


@router.delete("/{task_id}/attachments/{attachment_id}", status_code=204)
def delete_attachment(
    task_id: str,
    attachment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a file attachment from a task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    attachments = _attachments.get(task_id, [])
    attachment = next((a for a in attachments if a["id"] == attachment_id), None)
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    # Delete file from disk
    file_path = ATTACHMENTS_DIR / task_id / attachment["stored_name"]
    if file_path.exists():
        file_path.unlink()

    _attachments[task_id] = [a for a in attachments if a["id"] != attachment_id]
    return None


# ─── Audit Log ────────────────────────────────────────────────────────────────

@router.get("/{task_id}/audit-log")
def get_task_audit_log(
    task_id: str,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get the audit log (change history) for a task."""
    from app.models.task_collaboration import TaskAuditLog
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    logs = (
        db.query(TaskAuditLog)
        .filter(TaskAuditLog.task_id == task_id)
        .order_by(TaskAuditLog.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    result = []
    for log in logs:
        changed_by_user = db.query(User).filter(User.id == log.changed_by).first() if log.changed_by else None
        result.append({
            "id": log.id,
            "task_id": log.task_id,
            "field_changed": log.field_changed if hasattr(log, "field_changed") else log.action,
            "old_value": log.old_value if hasattr(log, "old_value") else None,
            "new_value": log.new_value if hasattr(log, "new_value") else None,
            "changed_by": log.changed_by,
            "changed_by_name": changed_by_user.full_name if changed_by_user else None,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })

    return result


# ─── Custom Fields ────────────────────────────────────────────────────────────

from app.models.custom_field import CustomFieldDefinition, CustomFieldValue, FieldType as CFType


@router.get("/projects/{project_id}/custom-fields")
def list_custom_fields(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all custom field definitions for a project."""
    fields = (
        db.query(CustomFieldDefinition)
        .filter(CustomFieldDefinition.project_id == project_id)
        .order_by(CustomFieldDefinition.display_order)
        .all()
    )
    return [
        {
            "id": f.id,
            "project_id": f.project_id,
            "name": f.name,
            "field_type": f.field_type,
            "options": f.options,
            "is_required": f.is_required,
            "display_order": f.display_order,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        }
        for f in fields
    ]


@router.post("/projects/{project_id}/custom-fields")
def create_custom_field(
    project_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a custom field definition for a project."""
    field = CustomFieldDefinition(
        project_id=project_id,
        name=payload.get("name", "Field"),
        field_type=payload.get("field_type", "text"),
        options=payload.get("options"),
        is_required=payload.get("is_required", False),
        display_order=str(payload.get("display_order", 0)),
    )
    db.add(field)
    db.commit()
    db.refresh(field)
    return {"id": field.id, "name": field.name, "field_type": field.field_type, "options": field.options}


@router.delete("/projects/{project_id}/custom-fields/{field_id}")
def delete_custom_field(
    project_id: str,
    field_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a custom field definition."""
    field = db.query(CustomFieldDefinition).filter(
        CustomFieldDefinition.id == field_id,
        CustomFieldDefinition.project_id == project_id,
    ).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    db.delete(field)
    db.commit()
    return {"deleted": True}


@router.get("/{task_id}/custom-field-values")
def get_task_custom_field_values(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all custom field values for a task."""
    values = db.query(CustomFieldValue).filter(CustomFieldValue.task_id == task_id).all()
    return [{"field_id": v.field_id, "value": v.value} for v in values]


@router.put("/{task_id}/custom-field-values")
def upsert_task_custom_field_values(
    task_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Upsert custom field values for a task. payload: {field_id: value, ...}"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    field_values: dict = payload.get("values", payload)
    for field_id, value in field_values.items():
        existing = db.query(CustomFieldValue).filter(
            CustomFieldValue.task_id == task_id,
            CustomFieldValue.field_id == field_id,
        ).first()
        if existing:
            existing.value = str(value) if value is not None else None
        else:
            db.add(CustomFieldValue(task_id=task_id, field_id=field_id, value=str(value) if value is not None else None))
    db.commit()
    return {"updated": True}
