"""AI-powered features API router."""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import User, Task, Project, Team
from app.utils import get_current_active_user
from app.services.ai_task_service import AITaskService

router = APIRouter()

# Schemas
class TaskPriorityResponse(BaseModel):
    task_id: str
    task_name: str
    priority_score: float
    current_priority: str
    suggested_priority: str

class DeadlineRiskResponse(BaseModel):
    task_id: str
    task_name: str
    due_date: Optional[str] = None
    risk_score: float
    risk_level: str
    factors: List[str]

class WorkloadSuggestion(BaseModel):
    type: str
    message: str
    priority: str

class WorkloadOptimizationResponse(BaseModel):
    suggestions: List[WorkloadSuggestion]
    rebalance_needed: bool
    overloaded_count: int
    underutilized_count: int

class NLTaskCreate(BaseModel):
    text: str
    project_id: Optional[str] = None

class NLTaskResponse(BaseModel):
    success: bool
    task: Optional[dict] = None
    message: str

class AITaskSuggestions(BaseModel):
    task_id: str
    suggestions: List[str]

# Endpoints
@router.get("/prioritize", response_model=List[TaskPriorityResponse])
def get_smart_priorities(
    project_id: Optional[str] = None,
    team_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get AI-calculated priority scores for tasks."""
    ai_service = AITaskService(db)
    
    query = db.query(Task).filter(
        Task.status.in_(["todo", "in_progress", "backlog", "waiting", "blocked"])
    )
    
    if project_id:
        query = query.filter(Task.project_id == project_id)
    if team_id:
        query = query.filter(Task.team_id == team_id)
    
    tasks = query.limit(50).all()
    results = []
    
    for task in tasks:
        score = ai_service.calculate_priority_score(task)
        
        # Map score to suggested priority
        if score >= 80:
            suggested = "urgent"
        elif score >= 60:
            suggested = "high"
        elif score >= 40:
            suggested = "medium"
        else:
            suggested = "low"
        
        results.append(TaskPriorityResponse(
            task_id=task.id,
            task_name=task.name,
            priority_score=round(score, 1),
            current_priority=task.priority,
            suggested_priority=suggested
        ))
    
    # Sort by priority score descending
    results.sort(key=lambda x: x.priority_score, reverse=True)
    return results

@router.get("/deadline-risks", response_model=List[DeadlineRiskResponse])
def get_deadline_risks(
    project_id: Optional[str] = None,
    risk_level: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get deadline risk predictions for tasks."""
    ai_service = AITaskService(db)
    
    query = db.query(Task).filter(
        Task.status.in_(["todo", "in_progress", "waiting", "blocked"]),
        Task.due_date != None
    )
    
    if project_id:
        query = query.filter(Task.project_id == project_id)
    
    tasks = query.limit(50).all()
    results = []
    
    for task in tasks:
        risk = ai_service.predict_deadline_risk(task)
        
        if risk_level and risk["risk_level"] != risk_level:
            continue
        
        results.append(DeadlineRiskResponse(
            task_id=task.id,
            task_name=task.name,
            due_date=task.due_date.isoformat() if task.due_date else None,
            risk_score=risk["risk_score"],
            risk_level=risk["risk_level"],
            factors=risk["factors"]
        ))
    
    # Sort by risk score descending
    results.sort(key=lambda x: x.risk_score, reverse=True)
    return results

@router.get("/workload-optimization/{team_id}", response_model=WorkloadOptimizationResponse)
def get_workload_optimization(
    team_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get workload optimization suggestions for a team."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    ai_service = AITaskService(db)
    result = ai_service.get_workload_optimization(team_id)
    
    return WorkloadOptimizationResponse(
        suggestions=[WorkloadSuggestion(**s) for s in result["suggestions"]],
        rebalance_needed=result["rebalance_needed"],
        overloaded_count=len(result["overloaded_members"]),
        underutilized_count=len(result["underutilized_members"])
    )

@router.post("/create-from-text", response_model=NLTaskResponse)
async def create_task_from_text(
    data: NLTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a task from natural language description."""
    ai_service = AITaskService(db)
    
    try:
        task_data = await ai_service.create_task_from_natural_language(data.text, current_user)
        
        if not task_data:
            return NLTaskResponse(
                success=False,
                message="Could not parse the task description"
            )
        
        if data.project_id:
            task_data["project_id"] = data.project_id
        
        # Create the task
        task = Task(**task_data)
        db.add(task)
        db.commit()
        db.refresh(task)
        
        return NLTaskResponse(
            success=True,
            task={
                "id": task.id,
                "name": task.name,
                "priority": task.priority,
                "due_date": task.due_date.isoformat() if task.due_date else None,
                "status": task.status
            },
            message="Task created successfully"
        )
    except Exception as e:
        return NLTaskResponse(
            success=False,
            message=f"Error creating task: {str(e)}"
        )

@router.get("/suggestions/{task_id}", response_model=AITaskSuggestions)
async def get_task_suggestions(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get AI-powered suggestions for a task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    ai_service = AITaskService(db)
    suggestions = await ai_service.get_ai_suggestions(task)
    
    return AITaskSuggestions(
        task_id=task.id,
        suggestions=suggestions
    )

@router.post("/apply-priority/{task_id}")
def apply_suggested_priority(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Apply AI-suggested priority to a task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    ai_service = AITaskService(db)
    score = ai_service.calculate_priority_score(task)
    
    # Map score to priority
    if score >= 80:
        new_priority = "urgent"
    elif score >= 60:
        new_priority = "high"
    elif score >= 40:
        new_priority = "medium"
    else:
        new_priority = "low"
    
    old_priority = task.priority
    task.priority = new_priority
    task.ai_priority_score = score
    db.commit()
    
    return {
        "task_id": task.id,
        "old_priority": old_priority,
        "new_priority": new_priority,
        "priority_score": round(score, 1)
    }
