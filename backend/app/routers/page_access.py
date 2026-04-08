"""
Page Access Router — Manages per-user page access grants.
Only admins can modify page access for other users.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Optional

from app.database import get_db
from app.models import User
from app.models.page_access import UserPageAccess, RESTRICTED_PAGES, get_accessible_pages
from app.utils import get_current_active_user
from app.utils.role_guards import is_admin

router = APIRouter(prefix="/page-access", tags=["Page Access"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class PageAccessUpdate(BaseModel):
    """Body for updating page access: { pages: { "operations": true, "ai": false, ... } }"""
    pages: Dict[str, bool]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_user_page_access_rows(db: Session, user_id: str) -> list:
    return db.query(UserPageAccess).filter(UserPageAccess.user_id == user_id).all()


def _compute_accessible_pages(db: Session, user: User) -> list:
    rows = _get_user_page_access_rows(db, user.id)
    return get_accessible_pages(user.role, rows)


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/me")
def get_my_page_access(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get the current user's accessible pages."""
    accessible = _compute_accessible_pages(db, current_user)
    return {
        "user_id": current_user.id,
        "role": current_user.role,
        "accessible_pages": accessible,
    }


@router.get("/{user_id}")
def get_user_page_access(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get page access for a specific user. Admin-only for other users."""
    # Users can see their own; only admins can see others
    if current_user.id != user_id and not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    rows = _get_user_page_access_rows(db, user_id)
    accessible = get_accessible_pages(user.role, rows)

    # Build a map of restricted pages → granted/not-granted (for admin UI)
    grants_map = {row.page_key: row.is_granted for row in rows}
    restricted_status = {
        page: grants_map.get(page, False) for page in RESTRICTED_PAGES
    }

    return {
        "user_id": user_id,
        "role": user.role,
        "accessible_pages": accessible,
        "restricted_pages_status": restricted_status,  # for admin toggle UI
    }


@router.put("/{user_id}")
def update_user_page_access(
    user_id: str,
    body: PageAccessUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Update page access grants for a user. Admin-only.
    Body: { pages: { "operations": true, "ai": false, ... } }
    """
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    for page_key, is_granted in body.pages.items():
        # Only restricted pages are manageable via this endpoint
        if page_key not in RESTRICTED_PAGES:
            continue  # silently skip always-accessible or unknown pages

        existing = db.query(UserPageAccess).filter(
            UserPageAccess.user_id == user_id,
            UserPageAccess.page_key == page_key,
        ).first()

        if existing:
            existing.is_granted = is_granted
        else:
            new_row = UserPageAccess(
                user_id=user_id,
                page_key=page_key,
                is_granted=is_granted,
                granted_by=current_user.id,
            )
            db.add(new_row)

    db.commit()

    # Return updated state
    rows = _get_user_page_access_rows(db, user_id)
    accessible = get_accessible_pages(target_user.role, rows)
    grants_map = {row.page_key: row.is_granted for row in rows}
    restricted_status = {
        page: grants_map.get(page, False) for page in RESTRICTED_PAGES
    }

    return {
        "success": True,
        "user_id": user_id,
        "accessible_pages": accessible,
        "restricted_pages_status": restricted_status,
    }
