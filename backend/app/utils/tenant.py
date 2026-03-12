"""
Tenant-scoping helpers for multi-tenant data isolation.

Every API endpoint that lists or creates org-owned data should call
`scope_to_org()` to ensure users only see their organization's data.
Super admins bypass this filter and can see all data.
"""
from typing import Optional
from sqlalchemy.orm import Query
from app.models.user import User


SUPER_ADMIN_ROLE = "system_admin"


def is_super_admin(user: User) -> bool:
    """Return True if the user is a platform-level super admin."""
    return user.role == SUPER_ADMIN_ROLE


def get_org_id(user: User) -> Optional[str]:
    """Return the organization_id of the current user, or None."""
    return getattr(user, "organization_id", None)


def scope_to_org(query: Query, model, current_user: User) -> Query:
    """
    Filter a SQLAlchemy query to the current user's organization.

    - Super admins are NOT filtered — they see all data.
    - Regular users only see data belonging to their organization.
    - If the user has no organization_id, the query is returned unfiltered
      (backwards compatible with legacy data).

    Usage:
        query = db.query(Project)
        query = scope_to_org(query, Project, current_user)
        results = query.all()
    """
    if is_super_admin(current_user):
        return query  # super admin sees everything

    org_id = get_org_id(current_user)
    if org_id and hasattr(model, "organization_id"):
        return query.filter(model.organization_id == org_id)

    return query


def set_org_id(record, current_user: User) -> None:
    """
    Stamp a newly created record with the creator's organization_id.

    Usage:
        new_project = Project(name=...)
        set_org_id(new_project, current_user)
        db.add(new_project)
    """
    if hasattr(record, "organization_id") and not is_super_admin(current_user):
        record.organization_id = get_org_id(current_user)
