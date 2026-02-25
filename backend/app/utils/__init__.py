# Utils package
from app.utils.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token,
    get_current_user,
    get_current_active_user,
)
from app.utils.role_guards import (
    require_roles,
    require_admin,
    require_manager,
    require_lead,
    is_admin,
    is_manager,
    is_lead_or_above,
    can_modify_task,
    can_delete_task,
    can_modify_project,
    can_modify_team,
    ADMIN_ROLES,
    MANAGER_ROLES,
    LEAD_ROLES,
)
from app.utils.error_handlers import (
    AppError,
    NotFoundError,
    ForbiddenError,
    ConflictError,
    ValidationError as AppValidationError,
    DependencyBlockedError,
    register_error_handlers,
)

__all__ = [
    # Security
    "verify_password",
    "get_password_hash",
    "create_access_token",
    "decode_access_token",
    "get_current_user",
    "get_current_active_user",
    # Role guards
    "require_roles",
    "require_admin",
    "require_manager",
    "require_lead",
    "is_admin",
    "is_manager",
    "is_lead_or_above",
    "can_modify_task",
    "can_delete_task",
    "can_modify_project",
    "can_modify_team",
    "ADMIN_ROLES",
    "MANAGER_ROLES",
    "LEAD_ROLES",
    # Error handlers
    "AppError",
    "NotFoundError",
    "ForbiddenError",
    "ConflictError",
    "AppValidationError",
    "DependencyBlockedError",
    "register_error_handlers",
]

