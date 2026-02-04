"""Calendar API router - Task calendar view with date-based filtering."""
from typing import List, Optional
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from pydantic import BaseModel
from app.database import get_db
from app.models import User, Task, Project, Milestone
from app.utils import get_current_active_user

router = APIRouter()


# Schemas
class CalendarEvent(BaseModel):
    id: str
    title: str
    type: str  # task, milestone, deadline
    start: datetime
    end: Optional[datetime] = None
    all_day: bool = True
    color: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class CalendarResponse(BaseModel):
    events: List[CalendarEvent]
    total: int


# Color mapping for priorities
PRIORITY_COLORS = {
    "critical": "#ef4444",  # red
    "high": "#f97316",      # orange
    "medium": "#eab308",    # yellow
    "low": "#22c55e",       # green
}

STATUS_COLORS = {
    "backlog": "#6b7280",
    "todo": "#3b82f6",
    "in_progress": "#8b5cf6",
    "review": "#f59e0b",
    "done": "#10b981",
    "blocked": "#ef4444",
}


@router.get("/tasks", response_model=CalendarResponse)
def get_calendar_tasks(
    start_date: date = Query(..., description="Start of date range"),
    end_date: date = Query(..., description="End of date range"),
    project_id: Optional[str] = None,
    assignee_id: Optional[str] = None,
    include_completed: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get tasks as calendar events within a date range."""
    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time())
    
    query = db.query(Task).options(
        joinedload(Task.project),
        joinedload(Task.assignee)
    )
    
    # Filter by date range - tasks with due_date or start_date in range
    query = query.filter(
        or_(
            and_(Task.due_date >= start_dt, Task.due_date <= end_dt),
            and_(Task.start_date >= start_dt, Task.start_date <= end_dt),
            and_(Task.start_date <= start_dt, Task.due_date >= end_dt)
        )
    )
    
    if project_id:
        query = query.filter(Task.project_id == project_id)
    
    if assignee_id:
        query = query.filter(Task.assignee_id == assignee_id)
    elif current_user.role not in ["admin", "manager"]:
        # Regular users see only their tasks
        query = query.filter(Task.assignee_id == current_user.id)
    
    if not include_completed:
        query = query.filter(Task.status != "done")
    
    tasks = query.all()
    
    events = []
    for task in tasks:
        event_date = task.due_date or task.start_date or task.created_at
        event = CalendarEvent(
            id=str(task.id),
            title=task.name,
            type="task",
            start=event_date,
            end=task.due_date if task.start_date else None,
            all_day=True,
            color=PRIORITY_COLORS.get(task.priority, "#6b7280"),
            project_id=str(task.project_id) if task.project_id else None,
            project_name=task.project.name if task.project else None,
            status=task.status,
            priority=task.priority,
            assignee_name=task.assignee.full_name if task.assignee else None
        )
        events.append(event)
    
    return CalendarResponse(events=events, total=len(events))


@router.get("/milestones", response_model=CalendarResponse)
def get_calendar_milestones(
    start_date: date = Query(..., description="Start of date range"),
    end_date: date = Query(..., description="End of date range"),
    project_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get project milestones as calendar events."""
    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time())
    
    query = db.query(Milestone).options(joinedload(Milestone.project))
    query = query.filter(
        Milestone.due_date >= start_dt,
        Milestone.due_date <= end_dt
    )
    
    if project_id:
        query = query.filter(Milestone.project_id == project_id)
    
    milestones = query.all()
    
    events = []
    for ms in milestones:
        event = CalendarEvent(
            id=str(ms.id),
            title=f"🎯 {ms.name}",
            type="milestone",
            start=ms.due_date,
            all_day=True,
            color="#8b5cf6",  # Purple for milestones
            project_id=str(ms.project_id) if ms.project_id else None,
            project_name=ms.project.name if ms.project else None,
            status=ms.status
        )
        events.append(event)
    
    return CalendarResponse(events=events, total=len(events))


@router.get("/all", response_model=CalendarResponse)
def get_all_calendar_events(
    start_date: date = Query(..., description="Start of date range"),
    end_date: date = Query(..., description="End of date range"),
    project_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all calendar events (tasks + milestones) within date range."""
    # Get tasks
    tasks_response = get_calendar_tasks(
        start_date=start_date,
        end_date=end_date,
        project_id=project_id,
        include_completed=False,
        db=db,
        current_user=current_user
    )
    
    # Get milestones
    milestones_response = get_calendar_milestones(
        start_date=start_date,
        end_date=end_date,
        project_id=project_id,
        db=db,
        current_user=current_user
    )
    
    all_events = tasks_response.events + milestones_response.events
    all_events.sort(key=lambda e: e.start)
    
    return CalendarResponse(events=all_events, total=len(all_events))


@router.put("/tasks/{task_id}/reschedule")
def reschedule_task(
    task_id: str,
    new_date: date = Query(..., description="New due date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Reschedule a task to a new date (drag-drop support)."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check permission
    if current_user.role not in ["admin", "manager"] and task.assignee_id != current_user.id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Not authorized")
    
    old_date = task.due_date
    task.due_date = datetime.combine(new_date, datetime.min.time())
    task.updated_at = datetime.utcnow()
    db.commit()
    
    return {
        "message": "Task rescheduled",
        "task_id": task_id,
        "old_date": old_date,
        "new_date": task.due_date
    }
