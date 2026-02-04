from typing import List
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Project, ProjectManager, User
from app.schemas import (
    ProjectCreate, ProjectUpdate, ProjectResponse,
    ProjectManagerResponse
)
from app.utils import get_current_active_user

router = APIRouter()


def build_project_response(project: Project, db: Session) -> dict:
    """Build project response with managers."""
    managers = []
    for pm in project.project_managers:
        user = db.query(User).filter(User.id == pm.user_id).first()
        managers.append(ProjectManagerResponse(
            id=pm.id,
            employee_id=pm.user_id,
            employee_name=user.full_name if user else None,
            role=pm.role,
            start_date=pm.start_date,
            end_date=pm.end_date
        ))
    
    return {
        "id": project.id,
        "name": project.name,
        "client_id": project.client_id,
        "department_id": project.department_id,
        "start_date": project.start_date,
        "end_date": project.end_date,
        "status": project.status,
        "contacts": project.contacts,
        "notes": project.notes,
        "created_at": project.created_at,
        "managers": managers
    }


@router.get("/", response_model=List[ProjectResponse])
def get_all_projects(
    skip: int = 0,
    limit: int = 100,
    client_id: str = None,
    department_id: str = None,
    status_filter: str = None,
    search: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all projects with optional filters."""
    query = db.query(Project)
    
    if client_id:
        query = query.filter(Project.client_id == client_id)
    if department_id:
        query = query.filter(Project.department_id == department_id)
    if status_filter:
        query = query.filter(Project.status == status_filter)
    if search:
        query = query.filter(Project.name.ilike(f"%{search}%"))
    
    projects = query.offset(skip).limit(limit).all()
    return [build_project_response(p, db) for p in projects]


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new project."""
    db_project = Project(
        name=project_data.name,
        client_id=project_data.client_id,
        department_id=project_data.department_id,
        start_date=project_data.start_date,
        end_date=project_data.end_date,
        status=project_data.status,
        contacts=project_data.contacts,
        notes=project_data.notes
    )
    db.add(db_project)
    db.flush()  # Get the ID before adding managers
    
    # Add managers if provided
    if project_data.managers:
        for mgr in project_data.managers:
            user = db.query(User).filter(User.id == mgr.employee_id).first()
            if not user:
                continue
            
            project_manager = ProjectManager(
                project_id=db_project.id,
                user_id=mgr.employee_id,
                role=mgr.role,
                start_date=mgr.start_date or date.today(),
                end_date=mgr.end_date
            )
            db.add(project_manager)
    
    db.commit()
    db.refresh(db_project)
    return build_project_response(db_project, db)


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific project by ID."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return build_project_response(project, db)


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    project_data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Update basic fields
    if project_data.name is not None:
        project.name = project_data.name
    if project_data.client_id is not None:
        project.client_id = project_data.client_id
    if project_data.department_id is not None:
        project.department_id = project_data.department_id
    if project_data.start_date is not None:
        project.start_date = project_data.start_date
    if project_data.end_date is not None:
        project.end_date = project_data.end_date
    if project_data.status is not None:
        project.status = project_data.status
    if project_data.contacts is not None:
        project.contacts = project_data.contacts
    if project_data.notes is not None:
        project.notes = project_data.notes
    
    # Update managers if provided
    if project_data.managers is not None:
        # Remove existing managers
        db.query(ProjectManager).filter(
            ProjectManager.project_id == project_id
        ).delete()
        
        # Add new managers
        for mgr in project_data.managers:
            user = db.query(User).filter(User.id == mgr.employee_id).first()
            if not user:
                continue
            
            project_manager = ProjectManager(
                project_id=project_id,
                user_id=mgr.employee_id,
                role=mgr.role,
                start_date=mgr.start_date or date.today(),
                end_date=mgr.end_date
            )
            db.add(project_manager)
    
    db.commit()
    db.refresh(project)
    return build_project_response(project, db)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.delete(project)
    db.commit()
    return None
