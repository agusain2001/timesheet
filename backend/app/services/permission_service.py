"""
RBAC (Role-Based Access Control) Service.
Provides permission checking and role management.
"""
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any, Set
from sqlalchemy.orm import Session
from functools import lru_cache
import logging

logger = logging.getLogger(__name__)


class PermissionService:
    """
    Production RBAC service for permission checking and role management.
    Supports role-based, resource-level, and project/team-scoped permissions.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self._permission_cache: Dict[str, Set[str]] = {}
    
    def has_permission(
        self,
        user_id: str,
        permission: str,  # e.g., "task.create"
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        scope_type: Optional[str] = None,  # project, team
        scope_id: Optional[str] = None
    ) -> bool:
        """
        Check if a user has a specific permission.
        Checks in order: cache -> resource permission -> role permission
        """
        # First check cache
        cache_key = f"{user_id}:{scope_type}:{scope_id}"
        if cache_key in self._permission_cache:
            if permission in self._permission_cache[cache_key]:
                return True
            if "*" in self._permission_cache[cache_key]:
                return True
        
        # Check direct resource permission
        if resource_id and resource_type:
            if self._check_resource_permission(user_id, resource_type, resource_id, permission.split('.')[-1]):
                return True
        
        # Check role-based permissions
        if self._check_role_permission(user_id, permission, scope_type, scope_id):
            return True
        
        return False
    
    def _check_resource_permission(
        self,
        user_id: str,
        resource_type: str,
        resource_id: str,
        action: str
    ) -> bool:
        """Check direct resource-level permission."""
        from app.models.permission import ResourcePermission
        
        now = datetime.utcnow()
        
        permission = self.db.query(ResourcePermission).filter(
            ResourcePermission.user_id == user_id,
            ResourcePermission.resource_type == resource_type,
            ResourcePermission.resource_id == resource_id,
            ResourcePermission.grant_type == "grant"
        ).filter(
            (ResourcePermission.expires_at == None) |
            (ResourcePermission.expires_at > now)
        ).first()
        
        if permission and action in (permission.actions or []):
            return True
        
        return False
    
    def _check_role_permission(
        self,
        user_id: str,
        permission: str,
        scope_type: Optional[str] = None,
        scope_id: Optional[str] = None
    ) -> bool:
        """Check role-based permission."""
        from app.models.permission import UserRole, RolePermission, Permission
        
        now = datetime.utcnow()
        
        # Get user's roles (global and scoped)
        query = self.db.query(UserRole).filter(
            UserRole.user_id == user_id,
            UserRole.valid_from <= now
        ).filter(
            (UserRole.valid_until == None) |
            (UserRole.valid_until > now)
        )
        
        # Include global roles and scoped roles
        if scope_type and scope_id:
            query = query.filter(
                (UserRole.scope_type == None) |
                ((UserRole.scope_type == scope_type) & (UserRole.scope_id == scope_id))
            )
        else:
            query = query.filter(UserRole.scope_type == None)
        
        user_roles = query.all()
        
        for user_role in user_roles:
            # Get role permissions
            role_perms = self.db.query(RolePermission).filter(
                RolePermission.role_id == user_role.role_id,
                RolePermission.grant_type == "grant"
            ).all()
            
            for rp in role_perms:
                perm = self.db.query(Permission).filter(Permission.id == rp.permission_id).first()
                if perm:
                    # Check exact match
                    if perm.name == permission:
                        return True
                    # Check wildcard (e.g., "task.*")
                    if perm.name.endswith(".*"):
                        resource_type = permission.split('.')[0]
                        if perm.name.startswith(resource_type):
                            return True
        
        return False
    
    def get_user_permissions(
        self,
        user_id: str,
        scope_type: Optional[str] = None,
        scope_id: Optional[str] = None
    ) -> List[str]:
        """Get all permissions for a user."""
        from app.models.permission import UserRole, RolePermission, Permission, ResourcePermission
        
        permissions = set()
        now = datetime.utcnow()
        
        # Get role-based permissions
        query = self.db.query(UserRole).filter(
            UserRole.user_id == user_id,
            UserRole.valid_from <= now
        ).filter(
            (UserRole.valid_until == None) |
            (UserRole.valid_until > now)
        )
        
        if scope_type and scope_id:
            query = query.filter(
                (UserRole.scope_type == None) |
                ((UserRole.scope_type == scope_type) & (UserRole.scope_id == scope_id))
            )
        
        user_roles = query.all()
        
        for user_role in user_roles:
            role_perms = self.db.query(RolePermission).filter(
                RolePermission.role_id == user_role.role_id,
                RolePermission.grant_type == "grant"
            ).all()
            
            for rp in role_perms:
                perm = self.db.query(Permission).filter(Permission.id == rp.permission_id).first()
                if perm:
                    permissions.add(perm.name)
        
        # Cache permissions
        cache_key = f"{user_id}:{scope_type}:{scope_id}"
        self._permission_cache[cache_key] = permissions
        
        return list(permissions)
    
    def get_user_roles(
        self,
        user_id: str,
        scope_type: Optional[str] = None,
        scope_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get all roles assigned to a user."""
        from app.models.permission import UserRole, Role
        
        now = datetime.utcnow()
        
        query = self.db.query(UserRole).filter(
            UserRole.user_id == user_id,
            UserRole.valid_from <= now
        ).filter(
            (UserRole.valid_until == None) |
            (UserRole.valid_until > now)
        )
        
        if scope_type and scope_id:
            query = query.filter(
                (UserRole.scope_type == None) |
                ((UserRole.scope_type == scope_type) & (UserRole.scope_id == scope_id))
            )
        
        user_roles = query.all()
        
        results = []
        for ur in user_roles:
            role = self.db.query(Role).filter(Role.id == ur.role_id).first()
            if role:
                results.append({
                    'id': ur.id,
                    'role_id': role.id,
                    'role_name': role.name,
                    'display_name': role.display_name,
                    'level': role.level,
                    'scope_type': ur.scope_type,
                    'scope_id': ur.scope_id,
                    'valid_from': ur.valid_from.isoformat() if ur.valid_from else None,
                    'valid_until': ur.valid_until.isoformat() if ur.valid_until else None
                })
        
        return results
    
    def assign_role(
        self,
        user_id: str,
        role_id: str,
        assigned_by: str,
        scope_type: Optional[str] = None,
        scope_id: Optional[str] = None,
        valid_until: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Assign a role to a user."""
        from app.models.permission import UserRole, Role, AuditLog
        
        # Check if role exists
        role = self.db.query(Role).filter(Role.id == role_id).first()
        if not role:
            return {'success': False, 'error': 'Role not found'}
        
        # Check if already assigned
        existing = self.db.query(UserRole).filter(
            UserRole.user_id == user_id,
            UserRole.role_id == role_id,
            UserRole.scope_type == scope_type,
            UserRole.scope_id == scope_id
        ).first()
        
        if existing:
            return {'success': False, 'error': 'Role already assigned'}
        
        # Create assignment
        user_role = UserRole(
            id=str(uuid.uuid4()),
            user_id=user_id,
            role_id=role_id,
            scope_type=scope_type,
            scope_id=scope_id,
            valid_until=valid_until,
            assigned_by=assigned_by
        )
        self.db.add(user_role)
        
        # Audit log
        audit = AuditLog(
            id=str(uuid.uuid4()),
            action="role_assigned",
            actor_id=assigned_by,
            target_type="user",
            target_id=user_id,
            details={
                'role_id': role_id,
                'role_name': role.name,
                'scope_type': scope_type,
                'scope_id': scope_id
            }
        )
        self.db.add(audit)
        
        self.db.commit()
        
        # Clear cache
        self._invalidate_cache(user_id)
        
        return {
            'success': True,
            'user_role_id': user_role.id,
            'role_name': role.name
        }
    
    def revoke_role(
        self,
        user_id: str,
        role_id: str,
        revoked_by: str,
        scope_type: Optional[str] = None,
        scope_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Revoke a role from a user."""
        from app.models.permission import UserRole, Role, AuditLog
        
        user_role = self.db.query(UserRole).filter(
            UserRole.user_id == user_id,
            UserRole.role_id == role_id,
            UserRole.scope_type == scope_type,
            UserRole.scope_id == scope_id
        ).first()
        
        if not user_role:
            return {'success': False, 'error': 'Role assignment not found'}
        
        role = self.db.query(Role).filter(Role.id == role_id).first()
        
        self.db.delete(user_role)
        
        # Audit log
        audit = AuditLog(
            id=str(uuid.uuid4()),
            action="role_revoked",
            actor_id=revoked_by,
            target_type="user",
            target_id=user_id,
            details={
                'role_id': role_id,
                'role_name': role.name if role else None,
                'scope_type': scope_type,
                'scope_id': scope_id
            }
        )
        self.db.add(audit)
        
        self.db.commit()
        
        # Clear cache
        self._invalidate_cache(user_id)
        
        return {'success': True}
    
    def grant_resource_permission(
        self,
        user_id: str,
        resource_type: str,
        resource_id: str,
        actions: List[str],
        granted_by: str,
        expires_at: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Grant direct resource-level permission."""
        from app.models.permission import ResourcePermission, AuditLog
        
        # Check if exists
        existing = self.db.query(ResourcePermission).filter(
            ResourcePermission.user_id == user_id,
            ResourcePermission.resource_type == resource_type,
            ResourcePermission.resource_id == resource_id
        ).first()
        
        if existing:
            # Update actions
            existing.actions = list(set(existing.actions or []) | set(actions))
            existing.granted_by = granted_by
            perm_id = existing.id
        else:
            perm = ResourcePermission(
                id=str(uuid.uuid4()),
                user_id=user_id,
                resource_type=resource_type,
                resource_id=resource_id,
                actions=actions,
                granted_by=granted_by,
                expires_at=expires_at
            )
            self.db.add(perm)
            perm_id = perm.id
        
        # Audit log
        audit = AuditLog(
            id=str(uuid.uuid4()),
            action="resource_permission_granted",
            actor_id=granted_by,
            target_type="user",
            target_id=user_id,
            details={
                'resource_type': resource_type,
                'resource_id': resource_id,
                'actions': actions
            }
        )
        self.db.add(audit)
        
        self.db.commit()
        
        return {'success': True, 'permission_id': perm_id}
    
    def revoke_resource_permission(
        self,
        user_id: str,
        resource_type: str,
        resource_id: str,
        revoked_by: str,
        actions: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Revoke resource-level permission."""
        from app.models.permission import ResourcePermission, AuditLog
        
        existing = self.db.query(ResourcePermission).filter(
            ResourcePermission.user_id == user_id,
            ResourcePermission.resource_type == resource_type,
            ResourcePermission.resource_id == resource_id
        ).first()
        
        if not existing:
            return {'success': False, 'error': 'Permission not found'}
        
        if actions:
            # Remove specific actions
            existing.actions = [a for a in (existing.actions or []) if a not in actions]
            if not existing.actions:
                self.db.delete(existing)
        else:
            # Remove entire permission
            self.db.delete(existing)
        
        # Audit log
        audit = AuditLog(
            id=str(uuid.uuid4()),
            action="resource_permission_revoked",
            actor_id=revoked_by,
            target_type="user",
            target_id=user_id,
            details={
                'resource_type': resource_type,
                'resource_id': resource_id,
                'actions': actions
            }
        )
        self.db.add(audit)
        
        self.db.commit()
        
        return {'success': True}
    
    def _invalidate_cache(self, user_id: str):
        """Invalidate permission cache for a user."""
        keys_to_remove = [k for k in self._permission_cache if k.startswith(f"{user_id}:")]
        for key in keys_to_remove:
            del self._permission_cache[key]
    
    def clear_cache(self):
        """Clear all permission cache."""
        self._permission_cache.clear()
    
    # ==================== Role Management ====================
    
    def create_role(
        self,
        name: str,
        display_name: str,
        description: str,
        level: str,
        permission_names: List[str],
        created_by: str,
        workspace_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new role."""
        from app.models.permission import Role, RolePermission, Permission, AuditLog
        
        # Check if name exists
        existing = self.db.query(Role).filter(Role.name == name).first()
        if existing:
            return {'success': False, 'error': 'Role name already exists'}
        
        # Create role
        role = Role(
            id=str(uuid.uuid4()),
            name=name,
            display_name=display_name,
            description=description,
            level=level,
            workspace_id=workspace_id,
            created_by=created_by
        )
        self.db.add(role)
        
        # Assign permissions
        for perm_name in permission_names:
            perm = self.db.query(Permission).filter(Permission.name == perm_name).first()
            if perm:
                role_perm = RolePermission(
                    id=str(uuid.uuid4()),
                    role_id=role.id,
                    permission_id=perm.id
                )
                self.db.add(role_perm)
        
        # Audit log
        audit = AuditLog(
            id=str(uuid.uuid4()),
            action="role_created",
            actor_id=created_by,
            target_type="role",
            target_id=role.id,
            details={
                'name': name,
                'permissions': permission_names
            }
        )
        self.db.add(audit)
        
        self.db.commit()
        
        return {'success': True, 'role_id': role.id}
    
    def get_all_permissions(self) -> List[Dict[str, Any]]:
        """Get all available permissions."""
        from app.models.permission import Permission
        
        permissions = self.db.query(Permission).order_by(Permission.category, Permission.name).all()
        
        return [
            {
                'id': p.id,
                'name': p.name,
                'display_name': p.display_name,
                'description': p.description,
                'resource_type': p.resource_type,
                'action': p.action,
                'category': p.category
            }
            for p in permissions
        ]
    
    def get_all_roles(self, workspace_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all roles."""
        from app.models.permission import Role
        
        query = self.db.query(Role)
        if workspace_id:
            query = query.filter(
                (Role.workspace_id == None) |
                (Role.workspace_id == workspace_id)
            )
        
        roles = query.order_by(Role.level, Role.name).all()
        
        return [
            {
                'id': r.id,
                'name': r.name,
                'display_name': r.display_name,
                'description': r.description,
                'level': r.level,
                'is_system': r.is_system,
                'is_default': r.is_default
            }
            for r in roles
        ]


def require_permission(permission: str):
    """Decorator for requiring a specific permission on an endpoint."""
    from functools import wraps
    from fastapi import HTTPException, Depends
    from app.utils import get_current_active_user
    from app.database import get_db
    
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            db = kwargs.get('db')
            current_user = kwargs.get('current_user')
            
            if not db or not current_user:
                raise HTTPException(status_code=500, detail="Missing dependencies")
            
            service = PermissionService(db)
            
            # Get scope from request if available
            scope_type = None
            scope_id = kwargs.get('project_id') or kwargs.get('team_id')
            if kwargs.get('project_id'):
                scope_type = 'project'
            elif kwargs.get('team_id'):
                scope_type = 'team'
            
            if not service.has_permission(current_user.id, permission, scope_type=scope_type, scope_id=scope_id):
                raise HTTPException(status_code=403, detail=f"Permission denied: {permission}")
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator
