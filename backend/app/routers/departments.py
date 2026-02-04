from typing import List
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Department, DepartmentManager, User
from app.schemas import (
    DepartmentCreate, DepartmentUpdate, DepartmentResponse,
    DepartmentManagerResponse
)
from app.utils import get_current_active_user

router = APIRouter()


def build_department_response(dept: Department, db: Session) -> dict:
    """Build department response with managers."""
    managers = []
    for dm in dept.department_managers:
        user = db.query(User).filter(User.id == dm.user_id).first()
        managers.append(DepartmentManagerResponse(
            id=dm.id,
            employee_id=dm.user_id,
            employee_name=user.full_name if user else None,
            is_primary=dm.is_primary,
            start_date=dm.start_date,
            end_date=dm.end_date
        ))
    
    return {
        "id": dept.id,
        "name": dept.name,
        "notes": dept.notes,
        "managers": managers
    }


@router.get("/", response_model=List[DepartmentResponse])
def get_all_departments(
    skip: int = 0,
    limit: int = 100,
    search: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all departments."""
    query = db.query(Department)
    
    if search:
        query = query.filter(Department.name.ilike(f"%{search}%"))
    
    departments = query.offset(skip).limit(limit).all()
    return [build_department_response(dept, db) for dept in departments]


@router.post("/", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    dept_data: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new department."""
    # Check admin role
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_dept = Department(name=dept_data.name, notes=dept_data.notes)
    db.add(db_dept)
    db.flush()  # Get the ID before adding managers
    
    # Add managers if provided
    if dept_data.managers:
        for mgr in dept_data.managers:
            # Verify user exists
            user = db.query(User).filter(User.id == mgr.employee_id).first()
            if not user:
                continue
            
            dept_manager = DepartmentManager(
                department_id=db_dept.id,
                user_id=mgr.employee_id,
                is_primary=mgr.is_primary,
                start_date=mgr.start_date or date.today(),
                end_date=mgr.end_date
            )
            db.add(dept_manager)
    
    db.commit()
    db.refresh(db_dept)
    return build_department_response(db_dept, db)


@router.get("/{dept_id}", response_model=DepartmentResponse)
def get_department(
    dept_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific department by ID."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return build_department_response(dept, db)


@router.put("/{dept_id}", response_model=DepartmentResponse)
def update_department(
    dept_id: str,
    dept_data: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a department."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    if dept_data.name is not None:
        dept.name = dept_data.name
    if dept_data.notes is not None:
        dept.notes = dept_data.notes
    
    # Update managers if provided
    if dept_data.managers is not None:
        # Remove existing managers
        db.query(DepartmentManager).filter(
            DepartmentManager.department_id == dept_id
        ).delete()
        
        # Add new managers
        for mgr in dept_data.managers:
            user = db.query(User).filter(User.id == mgr.employee_id).first()
            if not user:
                continue
            
            dept_manager = DepartmentManager(
                department_id=dept_id,
                user_id=mgr.employee_id,
                is_primary=mgr.is_primary,
                start_date=mgr.start_date or date.today(),
                end_date=mgr.end_date
            )
            db.add(dept_manager)
    
    db.commit()
    db.refresh(dept)
    return build_department_response(dept, db)


@router.delete("/{dept_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(
    dept_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a department."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    db.delete(dept)
    db.commit()
    return None
