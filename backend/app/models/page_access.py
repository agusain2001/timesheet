"""
UserPageAccess Model - Stores per-user page access grants.
Admins can grant or revoke access to specific pages for individual employees.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from app.database import Base


# Default pages that every role can access (no restriction needed)
ALWAYS_ACCESSIBLE = {"home", "my_time", "my_expense", "settings", "support", "search", "notifications", "privacy"}

# Pages that employees are restricted from by default; managers/admins always have access
RESTRICTED_PAGES = {"operations", "dashboards", "reports", "templates", "automation", "ai"}

# All manageable page keys
ALL_PAGE_KEYS = ALWAYS_ACCESSIBLE | RESTRICTED_PAGES


class UserPageAccess(Base):
    """
    Per-user page access overrides.
    Only relevant for 'employee' role — admin/manager always get full access.
    A row here means the employee has been GRANTED access to a restricted page.
    """
    __tablename__ = "user_page_access"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    page_key = Column(String(50), nullable=False)   # e.g. "operations", "ai", "reports"
    is_granted = Column(Boolean, default=True)

    # Who granted this
    granted_by = Column(String(36), ForeignKey("users.id"), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    granter = relationship("User", foreign_keys=[granted_by])

    __table_args__ = (
        UniqueConstraint("user_id", "page_key", name="uq_user_page_access"),
        Index("idx_user_page_access_user", "user_id"),
    )


def get_accessible_pages(user_role: str, page_access_rows: list) -> list:
    """
    Compute the full list of accessible page keys for a user.

    - admin / manager: all pages
    - employee: always-accessible pages + any explicitly granted restricted pages
    """
    if user_role in ("admin", "system_admin", "org_admin", "manager", "project_manager", "team_lead"):
        return list(ALL_PAGE_KEYS)

    # Employee: start with always-accessible base
    accessible = set(ALWAYS_ACCESSIBLE)

    # Add any explicitly granted restricted pages
    for row in page_access_rows:
        if row.is_granted and row.page_key in RESTRICTED_PAGES:
            accessible.add(row.page_key)

    return list(accessible)
