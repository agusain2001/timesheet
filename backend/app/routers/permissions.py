"""
Permissions and Roles API Router.
Manages role-based access control and permissions.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.utils import get_current_active_user
from app.services.permission_service import PermissionService


router = APIRouter(prefix="/permissions", tags=["Permissions & Roles"])


class RoleCreate(BaseModel):
    name: str
    display_name: str
    description: str
    level: str = "user"
    permission_names: List[str]
    workspace_id: Optional[str] = None


class RoleAssign(BaseModel):
    user_id: str
    role_id: str
    scope_type: Optional[str] = None
    scope_id: Optional[str] = None
    valid_until: Optional[datetime] = None


class ResourcePermissionGrant(BaseModel):
    user_id: str
    resource_type: str
    resource_id: str
    actions: List[str]
    expires_at: Optional[datetime] = None


# ==================== Permissions ====================

@router.get("/")
async def list_permissions(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """List all available permissions."""
    service = PermissionService(db)
    return service.get_all_permissions()


@router.get("/my-permissions")
async def get_my_permissions(
    scope_type: Optional[str] = None,
    scope_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get permissions for the current user."""
    service = PermissionService(db)
    return {
        "user_id": current_user.id,
        "permissions": service.get_user_permissions(
            current_user.id,
            scope_type=scope_type,
            scope_id=scope_id
        )
    }


@router.get("/check/{permission}")
async def check_permission(
    permission: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Check if current user has a specific permission."""
    service = PermissionService(db)
    has_permission = service.has_permission(
        user_id=current_user.id,
        permission=permission,
        resource_type=resource_type,
        resource_id=resource_id
    )
    return {
        "permission": permission,
        "granted": has_permission
    }


# ==================== Roles ====================

@router.get("/roles")
async def list_roles(
    workspace_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """List all roles."""
    service = PermissionService(db)
    return service.get_all_roles(workspace_id=workspace_id)


@router.post("/roles")
async def create_role(
    role: RoleCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Create a new role."""
    # Check if user has permission to create roles
    service = PermissionService(db)
    if not service.has_permission(current_user.id, "user.admin"):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    result = service.create_role(
        name=role.name,
        display_name=role.display_name,
        description=role.description,
        level=role.level,
        permission_names=role.permission_names,
        created_by=current_user.id,
        workspace_id=role.workspace_id
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result


@router.get("/roles/my-roles")
async def get_my_roles(
    scope_type: Optional[str] = None,
    scope_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get roles for the current user."""
    service = PermissionService(db)
    return service.get_user_roles(
        current_user.id,
        scope_type=scope_type,
        scope_id=scope_id
    )


# ==================== Role Assignments ====================

@router.post("/roles/assign")
async def assign_role(
    assignment: RoleAssign,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Assign a role to a user."""
    service = PermissionService(db)
    
    # Check if user has permission
    if not service.has_permission(current_user.id, "user.admin"):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    result = service.assign_role(
        user_id=assignment.user_id,
        role_id=assignment.role_id,
        assigned_by=current_user.id,
        scope_type=assignment.scope_type,
        scope_id=assignment.scope_id,
        valid_until=assignment.valid_until
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result


@router.delete("/roles/revoke")
async def revoke_role(
    assignment: RoleAssign,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Revoke a role from a user."""
    service = PermissionService(db)
    
    if not service.has_permission(current_user.id, "user.admin"):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    result = service.revoke_role(
        user_id=assignment.user_id,
        role_id=assignment.role_id,
        revoked_by=current_user.id,
        scope_type=assignment.scope_type,
        scope_id=assignment.scope_id
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result


# ==================== Resource Permissions ====================

@router.post("/resources/grant")
async def grant_resource_permission(
    grant: ResourcePermissionGrant,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Grant direct resource-level permission to a user."""
    service = PermissionService(db)
    
    # Check if user can grant permissions on this resource
    if not service.has_permission(current_user.id, f"{grant.resource_type}.admin"):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    result = service.grant_resource_permission(
        user_id=grant.user_id,
        resource_type=grant.resource_type,
        resource_id=grant.resource_id,
        actions=grant.actions,
        granted_by=current_user.id,
        expires_at=grant.expires_at
    )
    
    return result


@router.delete("/resources/revoke")
async def revoke_resource_permission(
    user_id: str,
    resource_type: str,
    resource_id: str,
    actions: Optional[List[str]] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Revoke resource-level permission from a user."""
    service = PermissionService(db)
    
    if not service.has_permission(current_user.id, f"{resource_type}.admin"):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    result = service.revoke_resource_permission(
        user_id=user_id,
        resource_type=resource_type,
        resource_id=resource_id,
        revoked_by=current_user.id,
        actions=actions
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result
