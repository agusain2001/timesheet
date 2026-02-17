"""
My Time Router
Dedicated endpoints for the My Time page — task listing with timer state,
weekly summary, work-state toggling, and task duplication.
"""
import uuid
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import (
    Task, User, Project, Client, ActiveTimer, TimeLog, Capacity,
    TaskStatus as TaskStatusEnum, TaskComment
)
from app.schemas import ProjectBrief, ClientBrief, UserBrief, CommentCreate, CommentResponse
from app.utils import get_current_active_user

router = APIRouter()


# =============== Helpers ===============

def _week_bounds() -> tuple[datetime, datetime]:
    """Return (Monday 00:00, Sunday 23:59:59) for the current week."""
    today = datetime.utcnow().date()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    return (
        datetime.combine(monday, datetime.min.time()),
        datetime.combine(sunday, datetime.max.time()),
    )


def _build_task_dict(task: Task, db: Session, timer: Optional[ActiveTimer] = None) -> dict:
    """Build a rich task response dict with project, client, assignee, and work state."""
    project_data = None
    client_data = None
    assignee_data = None
    owner_data = None

    if task.project:
        project_data = {
            "id": task.project.id,
            "name": task.project.name,
            "client_id": task.project.client_id,
            "status": task.project.status or "active",
        }
        if task.project.client_id:
            client = db.query(Client).filter(Client.id == task.project.client_id).first()
            if client:
                client_data = {"id": client.id, "name": client.name, "alias": client.alias}

    if task.assignee:
        assignee_data = {
            "id": task.assignee.id,
            "full_name": task.assignee.full_name,
            "email": task.assignee.email,
            "avatar_url": task.assignee.avatar_url,
        }

    if task.owner:
        owner_data = {
            "id": task.owner.id,
            "full_name": task.owner.full_name,
            "email": task.owner.email,
            "avatar_url": getattr(task.owner, "avatar_url", None),
        }

    # Determine work state from active timer
    work_state = "paused"
    elapsed_seconds = 0
    if timer and timer.task_id == task.id:
        work_state = "working"
        elapsed_seconds = int((datetime.utcnow() - timer.started_at).total_seconds())

    return {
        "id": task.id,
        "name": task.name,
        "description": task.description,
        "task_type": task.task_type,
        "project_id": task.project_id,
        "department_id": task.department_id,
        "assignee_id": task.assignee_id,
        "owner_id": task.owner_id,
        "priority": task.priority,
        "status": task.status,
        "estimated_hours": task.estimated_hours,
        "actual_hours": task.actual_hours,
        "due_date": task.due_date,
        "start_date": task.start_date,
        "created_at": task.created_at,
        "completed_at": task.completed_at,
        "tags": task.tags,
        "project": project_data,
        "client": client_data,
        "assignee": assignee_data,
        "owner": owner_data,
        "work_state": work_state,
        "elapsed_seconds": elapsed_seconds,
    }


# =============== Endpoints ===============

@router.get("/tasks")
def get_my_time_tasks(
    task_type: Optional[str] = None,
    project_id: Optional[str] = None,
    priority: Optional[str] = None,
    status_filter: Optional[str] = None,
    assignee_id: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = Query(None, description="Sort field: name, task_type, project, priority, status, assignee"),
    sort_order: Optional[str] = Query("asc", description="asc or desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get current user's tasks for the My Time page, enriched with work state."""
    query = db.query(Task).filter(
        (Task.assignee_id == current_user.id) | (Task.owner_id == current_user.id)
    )

    # Filters
    if task_type:
        query = query.filter(Task.task_type == task_type)
    if project_id:
        query = query.filter(Task.project_id == project_id)
    if priority:
        query = query.filter(Task.priority == priority)
    if status_filter:
        query = query.filter(Task.status == status_filter)
    if assignee_id:
        query = query.filter(Task.assignee_id == assignee_id)
    if search:
        query = query.filter(Task.name.ilike(f"%{search}%"))

    # Sorting
    sort_map = {
        "name": Task.name,
        "task_type": Task.task_type,
        "priority": Task.priority,
        "status": Task.status,
        "created_at": Task.created_at,
    }
    if sort_by and sort_by in sort_map:
        col = sort_map[sort_by]
        query = query.order_by(col.desc() if sort_order == "desc" else col.asc())
    else:
        query = query.order_by(Task.created_at.desc())

    tasks = query.all()

    # Get active timer for this user
    active_timer = db.query(ActiveTimer).filter(ActiveTimer.user_id == current_user.id).first()

    return [_build_task_dict(t, db, active_timer) for t in tasks]


@router.get("/summary")
def get_my_time_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Weekly progress summary for the My Time header cards."""
    week_start, week_end = _week_bounds()

    # Total hours logged this week
    total_hours = (
        db.query(func.coalesce(func.sum(TimeLog.hours), 0.0))
        .filter(
            TimeLog.user_id == current_user.id,
            TimeLog.date >= week_start,
            TimeLog.date <= week_end,
        )
        .scalar()
    ) or 0.0

    # Expected hours (from capacity or default 40)
    capacity = (
        db.query(Capacity)
        .filter(
            Capacity.user_id == current_user.id,
            Capacity.week_starting >= week_start,
            Capacity.week_starting <= week_end,
        )
        .first()
    )
    expected_hours = capacity.available_hours if capacity else 40.0
    remaining_hours = max(0.0, expected_hours - total_hours)

    # Daily breakdown for the progress bar (Mon-Sun)
    daily_hours = {}
    for i in range(7):
        day = week_start + timedelta(days=i)
        day_end = day + timedelta(days=1)
        hours = (
            db.query(func.coalesce(func.sum(TimeLog.hours), 0.0))
            .filter(
                TimeLog.user_id == current_user.id,
                TimeLog.date >= day,
                TimeLog.date < day_end,
            )
            .scalar()
        ) or 0.0
        daily_hours[day.strftime("%A")] = round(float(hours), 2)

    # Active task info
    active_timer = db.query(ActiveTimer).filter(ActiveTimer.user_id == current_user.id).first()
    current_task = None
    elapsed_seconds = 0
    if active_timer:
        elapsed_seconds = int((datetime.utcnow() - active_timer.started_at).total_seconds())
        task = db.query(Task).filter(Task.id == active_timer.task_id).first()
        current_task = {
            "id": active_timer.task_id,
            "name": task.name if task else "Unknown Task",
            "elapsed_seconds": elapsed_seconds,
        }

    return {
        "total_hours": round(float(total_hours), 2),
        "expected_hours": expected_hours,
        "remaining_hours": round(remaining_hours, 2),
        "daily_hours": daily_hours,
        "current_task": current_task,
    }


@router.put("/tasks/{task_id}/state")
def update_task_work_state(
    task_id: str,
    state: str = Query(..., description="'working' or 'paused'"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Toggle a task's work state between working (timer running) and paused."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if state == "working":
        # Stop any existing timer first
        existing = db.query(ActiveTimer).filter(ActiveTimer.user_id == current_user.id).first()
        if existing:
            # Log the old timer's time
            elapsed = (datetime.utcnow() - existing.started_at).total_seconds() / 3600.0
            if elapsed > 0.01:  # more than ~36 seconds
                log = TimeLog(
                    user_id=current_user.id,
                    task_id=existing.task_id,
                    project_id=existing.project_id,
                    date=datetime.utcnow(),
                    hours=round(elapsed, 4),
                    started_at=existing.started_at,
                    ended_at=datetime.utcnow(),
                    notes=existing.notes,
                )
                db.add(log)
            db.delete(existing)

        # Start new timer for this task
        timer = ActiveTimer(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            task_id=task_id,
            project_id=task.project_id,
            started_at=datetime.utcnow(),
        )
        db.add(timer)
        db.commit()

        return {"task_id": task_id, "work_state": "working", "message": "Timer started"}

    elif state == "paused":
        timer = db.query(ActiveTimer).filter(
            ActiveTimer.user_id == current_user.id,
            ActiveTimer.task_id == task_id,
        ).first()
        if timer:
            elapsed = (datetime.utcnow() - timer.started_at).total_seconds() / 3600.0
            if elapsed > 0.01:
                log = TimeLog(
                    user_id=current_user.id,
                    task_id=timer.task_id,
                    project_id=timer.project_id,
                    date=datetime.utcnow(),
                    hours=round(elapsed, 4),
                    started_at=timer.started_at,
                    ended_at=datetime.utcnow(),
                    notes=timer.notes,
                )
                db.add(log)
            db.delete(timer)
            db.commit()

        return {"task_id": task_id, "work_state": "paused", "message": "Timer paused"}

    else:
        raise HTTPException(status_code=400, detail="State must be 'working' or 'paused'")


@router.post("/tasks/{task_id}/duplicate")
def duplicate_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Duplicate a task — copies key fields, resets status to draft."""
    original = db.query(Task).filter(Task.id == task_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Task not found")

    new_task = Task(
        id=str(uuid.uuid4()),
        name=f"{original.name} (Copy)",
        description=original.description,
        task_type=original.task_type,
        project_id=original.project_id,
        department_id=original.department_id,
        team_id=original.team_id,
        assignee_id=current_user.id,
        owner_id=current_user.id,
        priority=original.priority,
        status=TaskStatusEnum.DRAFT.value,
        estimated_hours=original.estimated_hours,
        tags=original.tags,
        custom_fields=original.custom_fields,
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    return _build_task_dict(new_task, db)


# =============== Comment Endpoints ===============

@router.get("/tasks/{task_id}/comments", response_model=List[CommentResponse])
def get_task_comments(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all comments for a task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    comments = (
        db.query(TaskComment)
        .filter(TaskComment.task_id == task_id, TaskComment.is_deleted == False)
        .order_by(TaskComment.created_at.asc())
        .all()
    )

    results = []
    for c in comments:
        user = db.query(User).filter(User.id == c.user_id).first()
        results.append({
            "id": c.id,
            "task_id": c.task_id,
            "user_id": c.user_id,
            "content": c.content,
            "is_edited": c.is_edited,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "user": {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "avatar_url": user.avatar_url,
            } if user else None,
        })

    return results


@router.post("/tasks/{task_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_task_comment(
    task_id: str,
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Add a comment to a task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if not comment_data.content.strip():
        raise HTTPException(status_code=400, detail="Comment content cannot be empty")

    comment = TaskComment(
        id=str(uuid.uuid4()),
        task_id=task_id,
        user_id=current_user.id,
        content=comment_data.content.strip(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return {
        "id": comment.id,
        "task_id": comment.task_id,
        "user_id": comment.user_id,
        "content": comment.content,
        "is_edited": comment.is_edited,
        "created_at": comment.created_at,
        "updated_at": comment.updated_at,
        "user": {
            "id": current_user.id,
            "full_name": current_user.full_name,
            "email": current_user.email,
            "avatar_url": current_user.avatar_url,
        },
    }
