"""
Permission Model - Fine-grained RBAC permission system.
Supports per-module, per-project, and per-resource permissions.
"""
import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, JSON, Enum as SQLEnum, Index
from sqlalchemy.orm import relationship
from enum import Enum

from app.database import Base


class PermissionAction(str, Enum):
    """Available permission actions."""
    READ = "read"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    APPROVE = "approve"
    REASSIGN = "reassign"
    EXPORT = "export"
    ADMIN = "admin"


class ResourceType(str, Enum):
    """Resource types for permissions."""
    PROJECT = "project"
    TASK = "task"
    TEAM = "team"
    USER = "user"
    REPORT = "report"
    TIMESHEET = "timesheet"
    WORKSPACE = "workspace"
    AUTOMATION = "automation"
    INTEGRATION = "integration"
    SETTING = "setting"


class Permission(Base):
    """
    Permission definition table.
    Defines available permissions for each resource type.
    """
    __tablename__ = "permissions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Permission identifier
    name = Column(String(100), unique=True, nullable=False)  # e.g., "project.read"
    display_name = Column(String(200), nullable=False)
    description = Column(String(500))
    
    # Resource and action
    resource_type = Column(String(50), nullable=False)  # project, task, etc.
    action = Column(String(50), nullable=False)  # read, create, update, delete, etc.
    
    # Categorization
    category = Column(String(50))  # For grouping in UI
    is_system = Column(Boolean, default=False)  # System permissions can't be deleted
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_permission_resource_action', 'resource_type', 'action'),
    )


class Role(Base):
    """
    Role definition with assigned permissions.
    Roles are collections of permissions that can be assigned to users.
    """
    __tablename__ = "roles"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Role identifier
    name = Column(String(100), unique=True, nullable=False)
    display_name = Column(String(200), nullable=False)
    description = Column(String(500))
    
    # Scope
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=True)
    is_system = Column(Boolean, default=False)  # Built-in roles
    is_default = Column(Boolean, default=False)  # Default role for new users
    
    # Role level (for hierarchy)
    level = Column(String(20), default="user")  # org_admin, admin, manager, user, guest
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    created_by = Column(String(36), ForeignKey("users.id"))
    
    # Relationships
    permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")
    user_roles = relationship("UserRole", back_populates="role")
    workspace = relationship("Workspace", foreign_keys=[workspace_id])


class RolePermission(Base):
    """
    Junction table for role-permission assignments.
    """
    __tablename__ = "role_permissions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    role_id = Column(String(36), ForeignKey("roles.id"), nullable=False)
    permission_id = Column(String(36), ForeignKey("permissions.id"), nullable=False)
    
    # Optional: can grant or deny
    grant_type = Column(String(10), default="grant")  # grant, deny
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    role = relationship("Role", back_populates="permissions")
    permission = relationship("Permission")
    
    __table_args__ = (
        Index('idx_role_permission_unique', 'role_id', 'permission_id', unique=True),
    )


class UserRole(Base):
    """
    User role assignments.
    Links users to roles with optional scope (project/team level).
    """
    __tablename__ = "user_roles"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    role_id = Column(String(36), ForeignKey("roles.id"), nullable=False)
    
    # Scope (optional - for project/team level roles)
    scope_type = Column(String(20))  # None (global), project, team
    scope_id = Column(String(36))  # ID of project or team
    
    # Validity period (optional)
    valid_from = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    assigned_by = Column(String(36), ForeignKey("users.id"))
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    role = relationship("Role", back_populates="user_roles")
    
    __table_args__ = (
        Index('idx_user_role_scope', 'user_id', 'role_id', 'scope_type', 'scope_id'),
    )


class ResourcePermission(Base):
    """
    Direct resource-level permission grants.
    For granting permissions on specific resources to specific users.
    """
    __tablename__ = "resource_permissions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Who gets the permission
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # What resource
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(36), nullable=False)
    
    # What actions (stored as JSON array)
    actions = Column(JSON, default=list)  # ["read", "update"]
    
    # Grant type
    grant_type = Column(String(10), default="grant")  # grant, deny
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    granted_by = Column(String(36), ForeignKey("users.id"))
    expires_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    
    __table_args__ = (
        Index('idx_resource_permission_user', 'user_id', 'resource_type', 'resource_id'),
    )


class AuditLog(Base):
    """
    Permission audit log for tracking permission changes.
    """
    __tablename__ = "permission_audit_logs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # What happened
    action = Column(String(50), nullable=False)  # role_created, permission_granted, etc.
    
    # Who did it
    actor_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    actor_ip = Column(String(45))  # IPv4 or IPv6
    
    # What was affected
    target_type = Column(String(50))  # user, role, permission
    target_id = Column(String(36))
    
    # Details
    details = Column(JSON)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    actor = relationship("User", foreign_keys=[actor_id])
    
    __table_args__ = (
        Index('idx_audit_actor_date', 'actor_id', 'created_at'),
    )


# Default permissions to seed
DEFAULT_PERMISSIONS = [
    # Project permissions
    {"name": "project.read", "display_name": "View Projects", "resource_type": "project", "action": "read", "category": "Projects"},
    {"name": "project.create", "display_name": "Create Projects", "resource_type": "project", "action": "create", "category": "Projects"},
    {"name": "project.update", "display_name": "Edit Projects", "resource_type": "project", "action": "update", "category": "Projects"},
    {"name": "project.delete", "display_name": "Delete Projects", "resource_type": "project", "action": "delete", "category": "Projects"},
    {"name": "project.admin", "display_name": "Manage Project Settings", "resource_type": "project", "action": "admin", "category": "Projects"},
    
    # Task permissions
    {"name": "task.read", "display_name": "View Tasks", "resource_type": "task", "action": "read", "category": "Tasks"},
    {"name": "task.create", "display_name": "Create Tasks", "resource_type": "task", "action": "create", "category": "Tasks"},
    {"name": "task.update", "display_name": "Edit Tasks", "resource_type": "task", "action": "update", "category": "Tasks"},
    {"name": "task.delete", "display_name": "Delete Tasks", "resource_type": "task", "action": "delete", "category": "Tasks"},
    {"name": "task.reassign", "display_name": "Reassign Tasks", "resource_type": "task", "action": "reassign", "category": "Tasks"},
    {"name": "task.approve", "display_name": "Approve Tasks", "resource_type": "task", "action": "approve", "category": "Tasks"},
    
    # Team permissions
    {"name": "team.read", "display_name": "View Teams", "resource_type": "team", "action": "read", "category": "Teams"},
    {"name": "team.create", "display_name": "Create Teams", "resource_type": "team", "action": "create", "category": "Teams"},
    {"name": "team.update", "display_name": "Edit Teams", "resource_type": "team", "action": "update", "category": "Teams"},
    {"name": "team.delete", "display_name": "Delete Teams", "resource_type": "team", "action": "delete", "category": "Teams"},
    {"name": "team.admin", "display_name": "Manage Team Members", "resource_type": "team", "action": "admin", "category": "Teams"},
    
    # User permissions
    {"name": "user.read", "display_name": "View Users", "resource_type": "user", "action": "read", "category": "Users"},
    {"name": "user.create", "display_name": "Create Users", "resource_type": "user", "action": "create", "category": "Users"},
    {"name": "user.update", "display_name": "Edit Users", "resource_type": "user", "action": "update", "category": "Users"},
    {"name": "user.delete", "display_name": "Delete Users", "resource_type": "user", "action": "delete", "category": "Users"},
    {"name": "user.admin", "display_name": "Manage User Roles", "resource_type": "user", "action": "admin", "category": "Users"},
    
    # Report permissions
    {"name": "report.read", "display_name": "View Reports", "resource_type": "report", "action": "read", "category": "Reports"},
    {"name": "report.create", "display_name": "Create Reports", "resource_type": "report", "action": "create", "category": "Reports"},
    {"name": "report.export", "display_name": "Export Reports", "resource_type": "report", "action": "export", "category": "Reports"},
    
    # Timesheet permissions
    {"name": "timesheet.read", "display_name": "View Timesheets", "resource_type": "timesheet", "action": "read", "category": "Timesheets"},
    {"name": "timesheet.create", "display_name": "Log Time", "resource_type": "timesheet", "action": "create", "category": "Timesheets"},
    {"name": "timesheet.update", "display_name": "Edit Timesheets", "resource_type": "timesheet", "action": "update", "category": "Timesheets"},
    {"name": "timesheet.approve", "display_name": "Approve Timesheets", "resource_type": "timesheet", "action": "approve", "category": "Timesheets"},
    
    # Workspace permissions
    {"name": "workspace.read", "display_name": "View Workspace", "resource_type": "workspace", "action": "read", "category": "Workspace"},
    {"name": "workspace.update", "display_name": "Edit Workspace", "resource_type": "workspace", "action": "update", "category": "Workspace"},
    {"name": "workspace.admin", "display_name": "Manage Workspace", "resource_type": "workspace", "action": "admin", "category": "Workspace"},
    
    # Automation permissions
    {"name": "automation.read", "display_name": "View Automations", "resource_type": "automation", "action": "read", "category": "Automations"},
    {"name": "automation.create", "display_name": "Create Automations", "resource_type": "automation", "action": "create", "category": "Automations"},
    {"name": "automation.update", "display_name": "Edit Automations", "resource_type": "automation", "action": "update", "category": "Automations"},
    {"name": "automation.delete", "display_name": "Delete Automations", "resource_type": "automation", "action": "delete", "category": "Automations"},
    
    # Integration permissions
    {"name": "integration.read", "display_name": "View Integrations", "resource_type": "integration", "action": "read", "category": "Integrations"},
    {"name": "integration.create", "display_name": "Create Integrations", "resource_type": "integration", "action": "create", "category": "Integrations"},
    {"name": "integration.admin", "display_name": "Manage Integrations", "resource_type": "integration", "action": "admin", "category": "Integrations"},
]


# Default roles to seed
DEFAULT_ROLES = [
    {
        "name": "org_admin",
        "display_name": "Organization Admin",
        "description": "Full access to all resources in the organization",
        "level": "org_admin",
        "is_system": True,
        "permissions": ["*"]  # All permissions
    },
    {
        "name": "admin",
        "display_name": "Admin",
        "description": "Administrative access to workspace resources",
        "level": "admin",
        "is_system": True,
        "permissions": [
            "project.*", "task.*", "team.*", "user.read", "user.update",
            "report.*", "timesheet.*", "automation.*", "integration.*"
        ]
    },
    {
        "name": "manager",
        "display_name": "Manager",
        "description": "Can manage teams, projects, and tasks",
        "level": "manager",
        "is_system": True,
        "permissions": [
            "project.read", "project.create", "project.update",
            "task.*", "team.read", "team.update",
            "user.read", "report.*", "timesheet.*",
            "automation.read", "automation.create"
        ]
    },
    {
        "name": "member",
        "display_name": "Team Member",
        "description": "Standard team member with task access",
        "level": "user",
        "is_system": True,
        "is_default": True,
        "permissions": [
            "project.read", "task.read", "task.create", "task.update",
            "team.read", "user.read", "report.read",
            "timesheet.read", "timesheet.create", "timesheet.update"
        ]
    },
    {
        "name": "guest",
        "display_name": "Guest",
        "description": "View-only access to assigned resources",
        "level": "guest",
        "is_system": True,
        "permissions": [
            "project.read", "task.read", "team.read", "user.read"
        ]
    }
]
