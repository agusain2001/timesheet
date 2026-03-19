"""System-wide statistics and management endpoints — super admin only."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from app.database import get_db
from app.models import User
from app.models.organization import Organization
from app.utils.security import get_current_active_user
from app.utils.tenant import is_super_admin

router = APIRouter(prefix="/api/system", tags=["system"])


class UpdateUserStatusRequest(BaseModel):
    user_status: str


def _require_super_admin(current_user: User):
    if not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Super admin access required")


@router.get("/stats")
def get_system_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get platform-wide aggregated statistics. Super admin only."""
    _require_super_admin(current_user)

    from app.models import User as UserModel, Project, Task
    from app.models.time_tracking import ActiveTimer

    total_orgs = db.query(Organization).count()
    active_orgs = db.query(Organization).filter(Organization.is_active.is_(True)).count()
    inactive_orgs = total_orgs - active_orgs
    verified_orgs = db.query(Organization).filter(Organization.is_verified.is_(True)).count()

    total_users = db.query(UserModel).count()
    active_users = db.query(UserModel).filter(UserModel.is_active.is_(True)).count()
    pending_users = db.query(UserModel).filter(UserModel.user_status == "pending").count()
    suspended_users = db.query(UserModel).filter(UserModel.user_status == "suspended").count()

    total_projects = db.query(Project).count()
    active_projects = db.query(Project).filter(Project.status == "active").count()
    completed_projects = db.query(Project).filter(Project.status == "completed").count()

    total_tasks = db.query(Task).count()
    completed_tasks = db.query(Task).filter(Task.status == "completed").count()
    in_progress_tasks = db.query(Task).filter(Task.status == "in_progress").count()

    active_timers = db.query(ActiveTimer).count()

    return {
        "organizations": {
            "total": total_orgs,
            "active": active_orgs,
            "inactive": inactive_orgs,
            "verified": verified_orgs,
        },
        "users": {
            "total": total_users,
            "active": active_users,
            "pending": pending_users,
            "suspended": suspended_users,
        },
        "projects": {
            "total": total_projects,
            "active": active_projects,
            "completed": completed_projects,
        },
        "tasks": {
            "total": total_tasks,
            "completed": completed_tasks,
            "in_progress": in_progress_tasks,
        },
        "active_timers": active_timers,
    }


@router.get("/users")
def list_all_users(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    org_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get all users across all organizations. Super admin only."""
    _require_super_admin(current_user)

    from app.models import User as UserModel
    from app.models.organization import Organization

    query = db.query(
        UserModel,
        Organization.name.label("org_name")
    ).outerjoin(Organization, UserModel.organization_id == Organization.id)

    if search:
        q = f"%{search}%"
        query = query.filter(
            (UserModel.full_name.ilike(q)) |
            (UserModel.email.ilike(q))
        )
    if role:
        query = query.filter(UserModel.role == role)
    if status:
        query = query.filter(UserModel.user_status == status)
    if org_id:
        query = query.filter(UserModel.organization_id == org_id)

    total = query.count()
    results = query.offset(skip).limit(limit).all()

    users = []
    for user, org_name in results:
        users.append({
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "user_status": user.user_status,
            "is_active": user.is_active,
            "organization_id": user.organization_id,
            "organization_name": org_name,
            "avatar_url": user.avatar_url,
            "position": user.position,
            "last_login_at": user.last_login_at,
            "created_at": user.created_at,
        })

    return {"users": users, "total": total, "skip": skip, "limit": limit}


@router.put("/users/{user_id}/status")
def update_user_status(
    user_id: str,
    data: UpdateUserStatusRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a user's status (approve/suspend/reject). Super admin only."""
    _require_super_admin(current_user)

    from app.models import User as UserModel
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_status = data.user_status
    if new_status not in ("pending", "approved", "rejected", "suspended"):
        raise HTTPException(status_code=400, detail="Invalid status")

    user.user_status = new_status  # type: ignore[assignment]
    if new_status == "approved":
        user.is_active = True  # type: ignore[assignment]
    elif new_status in ("rejected", "suspended"):
        user.is_active = False  # type: ignore[assignment]

    db.commit()
    db.refresh(user)
    return {"success": True, "user_id": user_id, "user_status": new_status}
