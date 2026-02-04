from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Task, User, Project, Client, TaskStatus
from app.schemas import TaskCreate, TaskUpdate, TaskResponse, ProjectBrief, ClientBrief, UserBrief
from app.utils import get_current_active_user
from app.services.notification_service import NotificationService

router = APIRouter()


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
        # Get client from project
        if task.project.client_id:
            client = db.query(Client).filter(Client.id == task.project.client_id).first()
            if client:
                client_data = ClientBrief(
                    id=client.id,
                    name=client.name,
                    alias=client.alias
                )
    
    if task.assignee:
        assignee_data = UserBrief(
            id=task.assignee.id,
            full_name=task.assignee.full_name,
            email=task.assignee.email,
            avatar_url=task.assignee.avatar_url
        )
    
    return {
        "id": task.id,
        "name": task.name,
        "description": task.description,
        "task_type": task.task_type,
        "project_id": task.project_id,
        "department_id": task.department_id,
        "assignee_id": task.assignee_id,
        "priority": task.priority,
        "estimated_hours": task.estimated_hours,
        "due_date": task.due_date,
        "status": task.status,
        "created_at": task.created_at,
        "completed_at": task.completed_at,
        "project": project_data,
        "client": client_data,
        "assignee": assignee_data
    }


@router.get("/", response_model=List[TaskResponse])
def get_all_tasks(
    skip: int = 0,
    limit: int = 100,
    project_id: str = None,
    department_id: str = None,
    assignee_id: str = None,
    task_type: str = None,
    status_filter: str = None,
    search: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all tasks with optional filters."""
    query = db.query(Task)
    
    if project_id:
        query = query.filter(Task.project_id == project_id)
    if department_id:
        query = query.filter(Task.department_id == department_id)
    if assignee_id:
        query = query.filter(Task.assignee_id == assignee_id)
    if task_type:
        query = query.filter(Task.task_type == task_type)
    if status_filter:
        query = query.filter(Task.status == status_filter)
    if search:
        query = query.filter(Task.name.ilike(f"%{search}%"))
    
    tasks = query.offset(skip).limit(limit).all()
    return [build_task_response(t, db) for t in tasks]


@router.get("/my", response_model=List[TaskResponse])
def get_my_tasks(
    task_type: str = None,
    status_filter: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's tasks."""
    query = db.query(Task).filter(Task.assignee_id == current_user.id)
    
    if task_type:
        query = query.filter(Task.task_type == task_type)
    if status_filter:
        query = query.filter(Task.status == status_filter)
    
    tasks = query.all()
    return [build_task_response(t, db) for t in tasks]


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new task."""
    db_task = Task(**task_data.model_dump())
    
    # If no assignee, assign to current user for personal tasks
    if not db_task.assignee_id and task_data.task_type == "personal":
        db_task.assignee_id = current_user.id
    
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    
    # Send notification to assignee if assigned to someone else
    if db_task.assignee_id and db_task.assignee_id != current_user.id:
        NotificationService.notify_task_assigned(
            db=db,
            assignee_id=db_task.assignee_id,
            task_name=db_task.name,
            task_id=db_task.id,
            assigner_name=current_user.full_name
        )
    
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
        raise HTTPException(status_code=404, detail="Task not found")
    return build_task_response(task, db)


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: str,
    task_data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = task_data.model_dump(exclude_unset=True)
    old_assignee_id = task.assignee_id
    old_status = task.status
    
    # Handle status changes
    if "status" in update_data and update_data["status"] == TaskStatus.COMPLETED.value:
        task.completed_at = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(task, field, value)
    
    db.commit()
    db.refresh(task)
    
    # Notify new assignee if task was reassigned
    if "assignee_id" in update_data and task.assignee_id != old_assignee_id:
        if task.assignee_id and task.assignee_id != current_user.id:
            NotificationService.notify_task_assigned(
                db=db,
                assignee_id=task.assignee_id,
                task_name=task.name,
                task_id=task.id,
                assigner_name=current_user.full_name
            )
    
    # Notify task owner if task was completed by someone else
    if "status" in update_data and update_data["status"] == TaskStatus.COMPLETED.value:
        if old_status != TaskStatus.COMPLETED.value:
            # Could notify project manager or task creator here
            pass
    
    return build_task_response(task, db)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    db.delete(task)
    db.commit()
    return None
