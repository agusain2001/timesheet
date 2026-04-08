"""User approval management router — for org admins to approve/reject registrations."""
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import User
from app.utils import get_current_active_user
from app.utils.role_guards import is_admin
from app.utils.tenant import is_super_admin, get_org_id

router = APIRouter()


# ─── Schemas ─────────────────────────────────────────────────────────────────

class UserApprovalResponse(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    user_status: str
    email_verified: bool
    organization_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ApprovalAction(BaseModel):
    reason: Optional[str] = None  # Optional reason for rejection/suspension


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/users/pending", response_model=List[UserApprovalResponse])
def list_pending_users(
    status_filter: Optional[str] = None,  # pending | approved | rejected | suspended
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List users pending approval in the current org. Org admins and super admins only."""
    if not is_admin(current_user) and not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    query = db.query(User)

    if is_super_admin(current_user):
        # Super admin can see all pending users across all orgs
        pass
    else:
        # Org admin sees only their org
        org_id = get_org_id(current_user)
        if not org_id:
            return []
        query = query.filter(User.organization_id == org_id)

    # Apply status filter
    filter_status = status_filter or "pending"
    query = query.filter(User.user_status == filter_status)

    return query.order_by(User.created_at.desc()).all()


@router.put("/users/{user_id}/approve", response_model=UserApprovalResponse)
def approve_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Approve a pending user. Org admin or super admin only."""
    if not is_admin(current_user) and not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Ensure org admin only approves users in their org
    if not is_super_admin(current_user):
        if user.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="You can only approve users in your organization")

    user.user_status = "approved"
    user.email_verified = True  # Admin approval implies email is valid
    db.commit()
    db.refresh(user)

    # TODO: Send approval email notification
    return user


@router.put("/users/{user_id}/reject", response_model=UserApprovalResponse)
def reject_user(
    user_id: str,
    action: Optional[ApprovalAction] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Reject a pending user. Org admin or super admin only."""
    if not is_admin(current_user) and not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not is_super_admin(current_user):
        if user.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="You can only reject users in your organization")

    user.user_status = "rejected"
    db.commit()
    db.refresh(user)

    # TODO: Send rejection email notification
    return user


@router.put("/users/{user_id}/suspend", response_model=UserApprovalResponse)
def suspend_user(
    user_id: str,
    action: Optional[ApprovalAction] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Suspend an active user. Org admin or super admin only."""
    if not is_admin(current_user) and not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not is_super_admin(current_user):
        if user.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="You can only suspend users in your organization")

    # Cannot suspend yourself
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot suspend your own account")

    user.user_status = "suspended"
    db.commit()
    db.refresh(user)

    # TODO: Send suspension email notification
    return user


@router.put("/users/{user_id}/reactivate", response_model=UserApprovalResponse)
def reactivate_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Re-activate a suspended or rejected user."""
    if not is_admin(current_user) and not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not is_super_admin(current_user):
        if user.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Access denied")

    user.user_status = "approved"
    db.commit()
    db.refresh(user)
    return user
