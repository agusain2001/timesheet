from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.responses import StreamingResponse
from io import BytesIO
import csv
from datetime import datetime, timedelta
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.database import get_db
from app.models import User, Project, ProjectManager
from app.schemas import UserResponse, UserUpdate, UserCreate, UserProfileResponse, UserProfileUpdate
from app.utils import get_current_active_user, get_password_hash

router = APIRouter()


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new user (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if email exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user with hashed password
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        password_hash=hashed_password,
        full_name=user_data.full_name,
        role=user_data.role or "employee",
        department_id=user_data.department_id,
        position=user_data.position,
        avatar_url=user_data.avatar_url,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information."""
    return current_user


@router.get("/profile", response_model=UserProfileResponse)
def get_user_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's detailed profile information."""
    # Fetch user with related projects
    from app.models import ProjectManager
    
    projects_query = db.query(ProjectManager).filter(
        ProjectManager.user_id == current_user.id
    ).all()
    
    # Build profile response
    profile_data = {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "employee_id": current_user.id,  # Using user_id as employee_id
        "alias": getattr(current_user, 'alias', None),
        "user_type": "individual",  # Default to individual
        "role": current_user.role,
        "avatar_url": current_user.avatar_url,
        "position": current_user.position,
        "phone": current_user.phone,
        "bio": current_user.bio,
        # Business Details - using custom attributes or defaults
        "region": getattr(current_user, 'region', None),
        "company_size": getattr(current_user, 'company_size', None),
        "business_sector": getattr(current_user, 'business_sector', None),
        "website": getattr(current_user, 'website', None),
        # Contact Information
        "contact_person_name": getattr(current_user, 'contact_person_name', current_user.full_name),
        "contact_person_role": getattr(current_user, 'contact_person_role', current_user.position),
        "primary_phone": getattr(current_user, 'primary_phone', current_user.phone),
        "secondary_phone": getattr(current_user, 'secondary_phone', None),
        # Financial & Billing
        "preferred_currency": getattr(current_user, 'preferred_currency', 'USD'),
        "billing_type": getattr(current_user, 'billing_type', 'Fixed'),
        # Working preferences
        "timezone": current_user.timezone,
        "working_hours_start": current_user.working_hours_start,
        "working_hours_end": current_user.working_hours_end,
        # Meta
        "is_active": current_user.is_active,
        "created_at": current_user.created_at,
        # Projects
        "projects": [{"id": pm.project_id, "name": pm.project.name if pm.project else "Unknown"} for pm in projects_query] if projects_query else []
    }
    
    return profile_data


@router.put("/profile", response_model=UserProfileResponse)
def update_user_profile(
    profile_data: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update current user's profile information."""
    # Update only fields that are provided
    update_dict = profile_data.model_dump(exclude_unset=True)
    
    # Standard User model fields
    standard_fields = ['full_name', 'position', 'avatar_url', 'phone', 'bio', 
                      'timezone', 'working_hours_start', 'working_hours_end']
    
    # Extended fields (stored in settings JSON or would need model update)
    extended_fields = ['region', 'company_size', 'business_sector', 'website',
                      'contact_person_name', 'contact_person_role', 
                      'primary_phone', 'secondary_phone',
                      'preferred_currency', 'billing_type']
    
    # Update standard fields
    for field in standard_fields:
        if field in update_dict:
            setattr(current_user, field, update_dict[field])
    
    # Store extended fields in settings JSON
    if not current_user.settings:
        current_user.settings = {}
    
    for field in extended_fields:
        if field in update_dict:
            current_user.settings[field] = update_dict[field]
    
    db.commit()
    db.refresh(current_user)
    
    # Return updated profile using the GET endpoint logic
    from app.models import ProjectManager
    
    projects_query = db.query(ProjectManager).filter(
        ProjectManager.user_id == current_user.id
    ).all()
    
    profile_response = {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "employee_id": current_user.id,
        "alias": getattr(current_user, 'alias', None),
        "user_type": "individual",
        "role": current_user.role,
        "avatar_url": current_user.avatar_url,
        "position": current_user.position,
        "phone": current_user.phone,
        "bio": current_user.bio,
        # Business Details
        "region": current_user.settings.get('region') if current_user.settings else None,
        "company_size": current_user.settings.get('company_size') if current_user.settings else None,
        "business_sector": current_user.settings.get('business_sector') if current_user.settings else None,
        "website": current_user.settings.get('website') if current_user.settings else None,
        # Contact Information
        "contact_person_name": current_user.settings.get('contact_person_name', current_user.full_name) if current_user.settings else current_user.full_name,
        "contact_person_role": current_user.settings.get('contact_person_role', current_user.position) if current_user.settings else current_user.position,
        "primary_phone": current_user.settings.get('primary_phone', current_user.phone) if current_user.settings else current_user.phone,
        "secondary_phone": current_user.settings.get('secondary_phone') if current_user.settings else None,
        # Financial & Billing
        "preferred_currency": current_user.settings.get('preferred_currency', 'USD') if current_user.settings else 'USD',
        "billing_type": current_user.settings.get('billing_type', 'Fixed') if current_user.settings else 'Fixed',
        # Working preferences
        "timezone": current_user.timezone,
        "working_hours_start": current_user.working_hours_start,
        "working_hours_end": current_user.working_hours_end,
        # Meta
        "is_active": current_user.is_active,
        "created_at": current_user.created_at,
        # Projects
        "projects": [{"id": pm.project_id, "name": pm.project.name if pm.project else "Unknown"} for pm in projects_query] if projects_query else []
    }
    
    return profile_response


@router.get("/", response_model=List[UserResponse])
@router.get("/", response_model=List[UserResponse])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    department_id: str = None,
    status: str = None,
    search: str = None,
    sort_by: str = None,
    sort_order: str = "asc",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all users with optional filters and sorting."""
    query = db.query(User)
    
    # Filtering
    if department_id:
        query = query.filter(User.department_id == department_id)
    if status == "active":
        query = query.filter(User.is_active == True)
    elif status == "inactive":
        query = query.filter(User.is_active == False)
        
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (User.full_name.ilike(search_term)) | 
            (User.email.ilike(search_term))
        )
    
    # Sorting
    if sort_by:
        # Map sort_by string to actual column
        sort_column = None
        if sort_by == "name":
            sort_column = User.full_name
        elif sort_by == "email":
            sort_column = User.email
        elif sort_by == "department":
            sort_column = User.department_id # Sorting by department ID for now, ideal would be join
        elif sort_by == "position":
            sort_column = User.position
        elif sort_by == "created_at":
            sort_column = User.created_at
            
        if sort_column:
            if sort_order == "desc":
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())
    else:
        # Default sort by creation date desc
        query = query.order_by(User.created_at.desc())
    
    return query.offset(skip).limit(limit).all()



@router.get("/{user_id}/profile-summary")
def get_user_profile_summary(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Full 360° employee summary for manager view:
    - Basic profile
    - Active & recently completed tasks
    - Active & past projects
    - Teams membership
    - Logged hours (this week, month, total, last 8 weeks chart)
    - Task stats by status/priority
    - Recent activity (last 10 task updates)
    """
    from app.models.task import Task
    from app.models.time_tracking import TimeLog
    from app.models.team import TeamMember, Team
    from app.models.task_collaboration import TaskAuditLog

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.utcnow()
    week_start = now - timedelta(days=7)
    month_start = now - timedelta(days=30)

    # ── Tasks ──────────────────────────────────────────────────────────────────
    all_tasks = db.query(Task).options(
        joinedload(Task.project)
    ).filter(Task.assignee_id == user_id).all()

    def task_dict(t):
        return {
            "id": str(t.id),
            "name": t.name,
            "status": t.status,
            "priority": t.priority,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            "project_name": t.project.name if t.project else None,
            "project_id": str(t.project_id) if t.project_id else None,
            "estimated_hours": t.estimated_hours,
            "actual_hours": t.actual_hours or 0,
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
        }

    active_tasks = [task_dict(t) for t in all_tasks
                    if t.status not in ("done", "completed", "cancelled")]
    completed_tasks = sorted(
        [task_dict(t) for t in all_tasks
         if t.status in ("done", "completed") and t.completed_at and t.completed_at >= month_start],
        key=lambda x: x["completed_at"] or "", reverse=True
    )[:20]

    # Task stats
    status_counts: dict = {}
    priority_counts: dict = {}
    for t in all_tasks:
        status_counts[t.status] = status_counts.get(t.status, 0) + 1
        priority_counts[t.priority] = priority_counts.get(t.priority, 0) + 1

    overdue_count = sum(
        1 for t in all_tasks
        if t.status not in ("done", "completed", "cancelled")
        and t.due_date and t.due_date < now
    )

    # ── Projects ───────────────────────────────────────────────────────────────
    # Projects where user is assigned to tasks
    project_ids_from_tasks = list({t.project_id for t in all_tasks if t.project_id})
    # Projects where user is a manager
    managed_ids = [pm.project_id for pm in db.query(ProjectManager).filter(ProjectManager.user_id == user_id).all()]
    all_project_ids = list(set(project_ids_from_tasks + managed_ids))

    projects_raw = db.query(Project).filter(Project.id.in_(all_project_ids)).all() if all_project_ids else []

    def project_dict(p, role="member"):
        total = db.query(Task).filter(Task.project_id == p.id).count()
        done = db.query(Task).filter(Task.project_id == p.id, Task.status.in_(["done", "completed"])).count()
        progress = round((done / total * 100) if total > 0 else 0, 1)
        return {
            "id": str(p.id),
            "name": p.name,
            "code": p.code,
            "status": p.status,
            "priority": p.priority,
            "progress": progress,
            "total_tasks": total,
            "completed_tasks": done,
            "start_date": p.start_date.isoformat() if p.start_date else None,
            "end_date": p.end_date.isoformat() if p.end_date else None,
            "role": "Manager" if str(p.id) in [str(m) for m in managed_ids] else role,
        }

    active_statuses = {"active", "planning", "on_hold", "in_progress"}
    active_projects = [project_dict(p) for p in projects_raw if p.status in active_statuses]
    past_projects = [project_dict(p) for p in projects_raw if p.status not in active_statuses]

    # ── Teams ──────────────────────────────────────────────────────────────────
    memberships = db.query(TeamMember).options(
        joinedload(TeamMember.team)
    ).filter(TeamMember.user_id == user_id, TeamMember.is_active == True).all()

    teams_list = []
    for m in memberships:
        if m.team:
            member_count = db.query(TeamMember).filter(
                TeamMember.team_id == m.team_id, TeamMember.is_active == True
            ).count()
            lead_name = None
            if m.team.lead_id:
                lead = db.query(User).filter(User.id == m.team.lead_id).first()
                lead_name = lead.full_name if lead else None
            teams_list.append({
                "id": str(m.team.id),
                "name": m.team.name,
                "description": m.team.description,
                "role": m.role,
                "member_count": member_count,
                "lead_name": lead_name,
                "allocation_percentage": m.allocation_percentage,
            })

    # ── Hours ──────────────────────────────────────────────────────────────────
    hours_week = db.query(func.sum(TimeLog.hours)).filter(
        TimeLog.user_id == user_id,
        TimeLog.date >= week_start
    ).scalar() or 0.0

    hours_month = db.query(func.sum(TimeLog.hours)).filter(
        TimeLog.user_id == user_id,
        TimeLog.date >= month_start
    ).scalar() or 0.0

    hours_total = db.query(func.sum(TimeLog.hours)).filter(
        TimeLog.user_id == user_id
    ).scalar() or 0.0

    # Per-week chart — last 8 weeks
    weekly_hours = []
    for i in range(7, -1, -1):
        wk_start = now - timedelta(days=7 * (i + 1))
        wk_end = now - timedelta(days=7 * i)
        wk_hours = db.query(func.sum(TimeLog.hours)).filter(
            TimeLog.user_id == user_id,
            TimeLog.date >= wk_start,
            TimeLog.date < wk_end,
        ).scalar() or 0.0
        weekly_hours.append({
            "week": wk_start.strftime("W%W '%y"),
            "hours": round(float(wk_hours), 1),
        })

    # ── Recent activity (audit log) ────────────────────────────────────────────
    recent_activity = []
    try:
        logs = db.query(TaskAuditLog).options(
            joinedload(TaskAuditLog.task)
        ).filter(
            TaskAuditLog.user_id == user_id
        ).order_by(TaskAuditLog.created_at.desc()).limit(10).all()
        for log in logs:
            recent_activity.append({
                "type": log.action,
                "task_name": log.task.name if log.task else "Unknown",
                "task_id": str(log.task_id) if log.task_id else None,
                "description": log.description or f"{log.action} on task",
                "timestamp": log.created_at.isoformat() if log.created_at else None,
            })
    except Exception:
        pass  # audit log may not exist

    # ── Department ────────────────────────────────────────────────────────────
    dept = None
    if user.department:
        dept = {"id": str(user.department.id), "name": user.department.name}

    return {
        "user": {
            "id": str(user.id),
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "position": user.position,
            "avatar_url": user.avatar_url,
            "phone": user.phone,
            "bio": user.bio,
            "skills": user.skills or [],
            "expertise_level": user.expertise_level,
            "timezone": user.timezone,
            "working_hours_start": user.working_hours_start,
            "working_hours_end": user.working_hours_end,
            "availability_status": user.availability_status,
            "capacity_hours_week": user.capacity_hours_week or 40,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
            "department": dept,
        },
        "active_tasks": active_tasks,
        "completed_tasks_last_30d": completed_tasks,
        "projects": {
            "active": active_projects,
            "past": past_projects,
        },
        "teams": teams_list,
        "hours": {
            "this_week": round(float(hours_week), 1),
            "this_month": round(float(hours_month), 1),
            "total": round(float(hours_total), 1),
            "by_week": weekly_hours,
        },
        "task_stats": {
            "total": len(all_tasks),
            "active": len(active_tasks),
            "completed_total": status_counts.get("done", 0) + status_counts.get("completed", 0),
            "overdue": overdue_count,
            "in_progress": status_counts.get("in_progress", 0),
            "by_status": status_counts,
            "by_priority": priority_counts,
        },
        "recent_activity": recent_activity,
    }


@router.get("/{user_id}/projects")
def get_user_projects(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get projects associated with a user (as manager or team member)."""
    # Find projects where user is a manager
    managed_projects = db.query(Project).join(ProjectManager).filter(
        ProjectManager.user_id == user_id
    ).all()
    
    projects = []
    for p in managed_projects:
        projects.append({
            "id": p.id,
            "name": p.name,
            "role": "Manager", # Simplified
            "business_sector": p.department.name if p.department else "N/A", # Fallback
            "status": p.status
        })
        
    return projects


@router.post("/export")
def export_users(
    user_ids: List[str] = Body(..., embed=True),
    format: str = "csv",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Export selected users to CSV."""
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    
    if format == "csv":
        output = BytesIO()
        writer = csv.writer(output, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
        
        # Header
        writer.writerow(["ID", "Name", "Email", "Role", "Department", "Position", "Phone", "Status", "Joined Date"])
        
        # Rows
        for user in users:
            dept_name = user.department.name if user.department else "N/A"
            writer.writerow([
                user.id,
                user.full_name,
                user.email,
                user.role,
                dept_name,
                user.position or "",
                user.phone or "",
                "Active" if user.is_active else "Inactive",
                user.created_at.strftime("%Y-%m-%d") if user.created_at else ""
            ])
            
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=employees_export.csv"}
        )
            
    return {"message": "Format not supported"}


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific user by ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Only admin or the user themselves can update
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a user (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    return None
