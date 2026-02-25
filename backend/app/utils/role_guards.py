"""
Role-based access control helpers.
Provides FastAPI dependency functions for role/permission gating.
"""
from functools import wraps
from typing import List, Optional
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.utils.security import get_current_active_user


# Roles that can manage the whole system
ADMIN_ROLES = {"admin", "system_admin", "org_admin"}
MANAGER_ROLES = {"admin", "system_admin", "org_admin", "project_manager", "manager"}
LEAD_ROLES = {"admin", "system_admin", "org_admin", "project_manager", "manager", "team_lead"}


def require_roles(allowed_roles: List[str]):
    """
    FastAPI dependency that requires the current user to have one of the given roles.
    Usage:
        @router.post("/")
        def create(..., _: User = Depends(require_roles(["admin", "project_manager"]))):
    """
    async def checker(current_user: User = Depends(get_current_active_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return checker


def require_admin():
    """Require admin-level role."""
    return require_roles(list(ADMIN_ROLES))


def require_manager():
    """Require manager-level role or above."""
    return require_roles(list(MANAGER_ROLES))


def require_lead():
    """Require team lead role or above."""
    return require_roles(list(LEAD_ROLES))


def is_admin(user: User) -> bool:
    """Check if user has admin-level access."""
    return user.role in ADMIN_ROLES


def is_manager(user: User) -> bool:
    """Check if user has manager-level access."""
    return user.role in MANAGER_ROLES


def is_lead_or_above(user: User) -> bool:
    """Check if user has team lead access or above."""
    return user.role in LEAD_ROLES


def can_modify_task(task, current_user: User) -> bool:
    """
    Check if the current user can modify a task.
    Admins and managers can modify any task.
    Others can only modify tasks they own or are assigned to.
    """
    if is_manager(current_user):
        return True
    return (
        task.assignee_id == current_user.id
        or task.owner_id == current_user.id
    )


def can_delete_task(task, current_user: User) -> bool:
    """Check if user can delete a task."""
    if is_manager(current_user):
        return True
    return task.owner_id == current_user.id


def can_modify_project(project, current_user: User) -> bool:
    """Check if user can modify a project."""
    if is_manager(current_user):
        return True
    # Project managers assigned to this project
    manager_ids = [pm.user_id for pm in project.project_managers]
    return current_user.id in manager_ids


def can_modify_team(team, current_user: User) -> bool:
    """Check if user can modify a team."""
    if is_manager(current_user):
        return True
    return team.lead_id == current_user.id
