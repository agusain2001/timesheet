"""Gantt/Timeline API router - Project timeline with dependencies."""
from typing import List, Optional
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from pydantic import BaseModel
from app.database import get_db
from app.models import User, Task, Project, TaskDependency, Milestone, ProjectPhase
from app.utils import get_current_active_user

router = APIRouter()


# Schemas
class GanttDependency(BaseModel):
    from_task_id: str
    to_task_id: str
    type: str  # FS, SS, FF, SF


class GanttTask(BaseModel):
    id: str
    name: str
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    progress: float = 0
    type: str = "task"  # task, milestone, phase
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    parent_id: Optional[str] = None
    dependencies: List[str] = []
    color: Optional[str] = None
    
    class Config:
        from_attributes = True


class GanttMilestone(BaseModel):
    id: str
    name: str
    date: datetime
    project_id: str
    project_name: Optional[str] = None
    status: Optional[str] = None


class GanttPhase(BaseModel):
    id: str
    name: str
    start: datetime
    end: datetime
    project_id: str
    color: Optional[str] = None


class GanttResponse(BaseModel):
    tasks: List[GanttTask]
    milestones: List[GanttMilestone]
    phases: List[GanttPhase]
    dependencies: List[GanttDependency]


# Color mapping
STATUS_COLORS = {
    "backlog": "#94a3b8",
    "todo": "#3b82f6",
    "in_progress": "#8b5cf6",
    "review": "#f59e0b",
    "done": "#10b981",
    "blocked": "#ef4444",
}


def calculate_progress(task: Task) -> float:
    """Calculate task progress based on status."""
    progress_map = {
        "backlog": 0,
        "todo": 0,
        "in_progress": 50,
        "review": 80,
        "done": 100,
        "blocked": 20,
    }
    return progress_map.get(task.status, 0)


@router.get("/project/{project_id}", response_model=GanttResponse)
def get_project_gantt(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get Gantt chart data for a specific project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get tasks
    tasks_query = db.query(Task).options(
        joinedload(Task.assignee)
    ).filter(Task.project_id == project_id)
    
    tasks = tasks_query.all()
    
    gantt_tasks = []
    for task in tasks:
        start_date = task.start_date or task.created_at
        end_date = task.due_date or (start_date + timedelta(days=1))
        
        gantt_task = GanttTask(
            id=str(task.id),
            name=task.name,
            start=start_date,
            end=end_date,
            progress=calculate_progress(task),
            type="task",
            project_id=str(project_id),
            project_name=project.name,
            assignee_id=str(task.assignee_id) if task.assignee_id else None,
            assignee_name=task.assignee.full_name if task.assignee else None,
            status=task.status,
            priority=task.priority,
            color=STATUS_COLORS.get(task.status, "#6b7280")
        )
        gantt_tasks.append(gantt_task)
    
    # Get dependencies
    task_ids = [str(t.id) for t in tasks]
    deps_query = db.query(TaskDependency).filter(
        TaskDependency.task_id.in_(task_ids)
    )
    
    dependencies = []
    for dep in deps_query.all():
        dependencies.append(GanttDependency(
            from_task_id=str(dep.depends_on_id),
            to_task_id=str(dep.task_id),
            type=dep.dependency_type
        ))
    
    # Get milestones
    milestones_query = db.query(Milestone).filter(Milestone.project_id == project_id)
    milestones = []
    for ms in milestones_query.all():
        milestones.append(GanttMilestone(
            id=str(ms.id),
            name=ms.name,
            date=ms.due_date,
            project_id=str(project_id),
            project_name=project.name,
            status=ms.status
        ))
    
    # Get phases
    phases_query = db.query(ProjectPhase).filter(ProjectPhase.project_id == project_id)
    phases = []
    for phase in phases_query.all():
        phases.append(GanttPhase(
            id=str(phase.id),
            name=phase.name,
            start=phase.start_date,
            end=phase.end_date or (phase.start_date + timedelta(days=30)),
            project_id=str(project_id),
            color=phase.color
        ))
    
    return GanttResponse(
        tasks=gantt_tasks,
        milestones=milestones,
        phases=phases,
        dependencies=dependencies
    )


@router.get("/tasks", response_model=GanttResponse)
def get_all_tasks_gantt(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    project_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get Gantt chart data for all tasks (optionally filtered)."""
    query = db.query(Task).options(
        joinedload(Task.project),
        joinedload(Task.assignee)
    )
    
    if start_date:
        start_dt = datetime.combine(start_date, datetime.min.time())
        query = query.filter(Task.due_date >= start_dt)
    
    if end_date:
        end_dt = datetime.combine(end_date, datetime.max.time())
        query = query.filter(Task.start_date <= end_dt)
    
    if project_id:
        query = query.filter(Task.project_id == project_id)
    
    if current_user.role not in ["admin", "manager"]:
        query = query.filter(Task.assignee_id == current_user.id)
    
    tasks = query.all()
    
    gantt_tasks = []
    task_ids = []
    for task in tasks:
        task_ids.append(str(task.id))
        start = task.start_date or task.created_at
        end = task.due_date or (start + timedelta(days=1))
        
        gantt_task = GanttTask(
            id=str(task.id),
            name=task.name,
            start=start,
            end=end,
            progress=calculate_progress(task),
            type="task",
            project_id=str(task.project_id) if task.project_id else None,
            project_name=task.project.name if task.project else None,
            assignee_id=str(task.assignee_id) if task.assignee_id else None,
            assignee_name=task.assignee.full_name if task.assignee else None,
            status=task.status,
            priority=task.priority,
            color=STATUS_COLORS.get(task.status, "#6b7280")
        )
        gantt_tasks.append(gantt_task)
    
    # Get dependencies
    deps = []
    if task_ids:
        deps_query = db.query(TaskDependency).filter(
            TaskDependency.task_id.in_(task_ids)
        )
        for dep in deps_query.all():
            deps.append(GanttDependency(
                from_task_id=str(dep.depends_on_id),
                to_task_id=str(dep.task_id),
                type=dep.dependency_type
            ))
    
    return GanttResponse(
        tasks=gantt_tasks,
        milestones=[],
        phases=[],
        dependencies=deps
    )


@router.put("/tasks/{task_id}/dates")
def update_task_dates(
    task_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update task start and end dates (for Gantt drag-drop)."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if current_user.role not in ["admin", "manager"] and task.assignee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if start_date:
        task.start_date = datetime.combine(start_date, datetime.min.time())
    if end_date:
        task.due_date = datetime.combine(end_date, datetime.max.time())
    
    task.updated_at = datetime.utcnow()
    db.commit()
    
    return {
        "message": "Task dates updated",
        "task_id": task_id,
        "start_date": task.start_date,
        "due_date": task.due_date
    }
