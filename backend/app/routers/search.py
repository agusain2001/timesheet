"""Global Search API router - Full-text search across entities."""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from pydantic import BaseModel
from app.database import get_db
from app.models import User, Task, Project, Team
from app.utils import get_current_active_user

router = APIRouter()


# Schemas
class SearchResult(BaseModel):
    id: str
    type: str  # task, project, user, team
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    url: str
    score: float = 1.0
    metadata: Optional[dict] = None


class SearchResponse(BaseModel):
    query: str
    total: int
    results: List[SearchResult]
    by_type: dict


@router.get("/", response_model=SearchResponse)
def global_search(
    q: str = Query(..., min_length=2, description="Search query"),
    types: Optional[str] = Query(None, description="Comma-separated types: task,project,user,team"),
    limit: int = Query(20, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Global search across all entities."""
    search_term = f"%{q.lower()}%"
    results = []
    by_type = {"task": 0, "project": 0, "user": 0, "team": 0}
    
    allowed_types = types.split(",") if types else ["task", "project", "user", "team"]
    
    # Search Tasks
    if "task" in allowed_types:
        tasks = db.query(Task).filter(
            or_(
                func.lower(Task.name).like(search_term),
                func.lower(Task.description).like(search_term),
                func.lower(Task.tags).like(search_term)
            )
        ).limit(limit).all()
        
        for task in tasks:
            results.append(SearchResult(
                id=str(task.id),
                type="task",
                title=task.name,
                subtitle=f"Status: {task.status} | Priority: {task.priority}",
                description=task.description[:100] if task.description else None,
                url=f"/tasks?id={task.id}",
                metadata={"status": task.status, "priority": task.priority}
            ))
        by_type["task"] = len(tasks)
    
    # Search Projects
    if "project" in allowed_types:
        projects = db.query(Project).filter(
            or_(
                func.lower(Project.name).like(search_term),
                func.lower(Project.description).like(search_term),
                func.lower(Project.code).like(search_term)
            )
        ).limit(limit).all()
        
        for project in projects:
            results.append(SearchResult(
                id=str(project.id),
                type="project",
                title=project.name,
                subtitle=f"Code: {project.code}" if project.code else None,
                description=project.description[:100] if project.description else None,
                url=f"/projects?id={project.id}",
                metadata={"status": project.status}
            ))
        by_type["project"] = len(projects)
    
    # Search Users
    if "user" in allowed_types:
        users = db.query(User).filter(
            or_(
                func.lower(User.full_name).like(search_term),
                func.lower(User.email).like(search_term),
                func.lower(User.position).like(search_term)
            ),
            User.is_active == True
        ).limit(limit).all()
        
        for user in users:
            results.append(SearchResult(
                id=str(user.id),
                type="user",
                title=user.full_name,
                subtitle=user.position or user.role,
                description=user.email,
                url=f"/employees?id={user.id}",
                metadata={"role": user.role}
            ))
        by_type["user"] = len(users)
    
    # Search Teams
    if "team" in allowed_types:
        teams = db.query(Team).filter(
            or_(
                func.lower(Team.name).like(search_term),
                func.lower(Team.description).like(search_term)
            )
        ).limit(limit).all()
        
        for team in teams:
            results.append(SearchResult(
                id=str(team.id),
                type="team",
                title=team.name,
                description=team.description[:100] if team.description else None,
                url=f"/teams?id={team.id}",
                metadata={}
            ))
        by_type["team"] = len(teams)
    
    # Sort by relevance (exact matches first)
    def relevance_score(result: SearchResult) -> float:
        title_lower = result.title.lower()
        if title_lower == q.lower():
            return 3.0
        elif title_lower.startswith(q.lower()):
            return 2.0
        else:
            return 1.0
    
    for result in results:
        result.score = relevance_score(result)
    
    results.sort(key=lambda x: x.score, reverse=True)
    
    return SearchResponse(
        query=q,
        total=len(results),
        results=results[:limit],
        by_type=by_type
    )


@router.get("/suggestions")
def get_search_suggestions(
    q: str = Query(..., min_length=1),
    limit: int = Query(5, le=10),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get search suggestions for autocomplete."""
    search_term = f"{q.lower()}%"
    suggestions = []
    
    # Task names
    tasks = db.query(Task.name).filter(
        func.lower(Task.name).like(search_term)
    ).limit(limit).all()
    suggestions.extend([{"text": t.name, "type": "task"} for t in tasks])
    
    # Project names
    projects = db.query(Project.name).filter(
        func.lower(Project.name).like(search_term)
    ).limit(limit).all()
    suggestions.extend([{"text": p.name, "type": "project"} for p in projects])
    
    # User names
    users = db.query(User.full_name).filter(
        func.lower(User.full_name).like(search_term),
        User.is_active == True
    ).limit(limit).all()
    suggestions.extend([{"text": u.full_name, "type": "user"} for u in users])
    
    return {"suggestions": suggestions[:limit]}
