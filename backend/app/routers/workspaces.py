"""Workspaces API router — full CRUD + member management."""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uuid

from app.database import get_db
from app.models import Workspace, WorkspaceMember, User
from app.utils import get_current_active_user

router = APIRouter()


# ─── Schemas ─────────────────────────────────────────────────────────────────

class WorkspaceMemberInput(BaseModel):
    user_id: str
    role: str = "member"


class WorkspaceMemberResponse(BaseModel):
    id: str
    workspace_id: str
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    role: str
    is_active: bool
    joined_at: datetime

    class Config:
        from_attributes = True


class WorkspaceCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    settings: Optional[dict] = None


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    settings: Optional[dict] = None
    is_active: Optional[bool] = None


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    owner_id: Optional[str] = None
    logo_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    member_count: int = 0
    members: List[WorkspaceMemberResponse] = []

    class Config:
        from_attributes = True


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _build_response(ws: Workspace, db: Session) -> dict:
    members_raw = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == ws.id,
        WorkspaceMember.is_active == True
    ).all()

    members = []
    for m in members_raw:
        user = db.query(User).filter(User.id == m.user_id).first()
        members.append({
            "id": m.id,
            "workspace_id": m.workspace_id,
            "user_id": m.user_id,
            "user_name": user.full_name if user else None,
            "user_email": user.email if user else None,
            "role": m.role,
            "is_active": m.is_active,
            "joined_at": m.joined_at,
        })

    return {
        "id": ws.id,
        "name": ws.name,
        "slug": ws.slug,
        "description": ws.description,
        "owner_id": ws.owner_id,
        "logo_url": ws.logo_url,
        "is_active": ws.is_active,
        "created_at": ws.created_at,
        "member_count": len(members),
        "members": members,
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/")
def list_workspaces(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all workspaces."""
    query = db.query(Workspace).filter(Workspace.is_active == True)
    if search:
        query = query.filter(
            Workspace.name.ilike(f"%{search}%") |
            Workspace.description.ilike(f"%{search}%")
        )
    workspaces = query.offset(skip).limit(limit).all()
    return {"items": [_build_response(ws, db) for ws in workspaces], "total": query.count()}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_workspace(
    data: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new workspace."""
    # Auto-generate slug if not provided
    slug = data.slug or data.name.lower().replace(" ", "-").replace("_", "-")
    # Ensure slug uniqueness
    existing = db.query(Workspace).filter(Workspace.slug == slug).first()
    if existing:
        slug = f"{slug}-{str(uuid.uuid4())[:8]}"

    ws = Workspace(
        id=str(uuid.uuid4()),
        name=data.name,
        slug=slug,
        description=data.description,
        owner_id=current_user.id,
        logo_url=data.logo_url,
        settings=data.settings or {},
    )
    db.add(ws)
    db.commit()
    db.refresh(ws)

    # Auto-add creator as admin member
    member = WorkspaceMember(
        id=str(uuid.uuid4()),
        workspace_id=ws.id,
        user_id=current_user.id,
        role="admin",
    )
    db.add(member)
    db.commit()

    return _build_response(ws, db)


@router.get("/{workspace_id}")
def get_workspace(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a workspace by ID."""
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return _build_response(ws, db)


@router.put("/{workspace_id}")
def update_workspace(
    workspace_id: str,
    data: WorkspaceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a workspace."""
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(ws, field, value)
    ws.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ws)
    return _build_response(ws, db)


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Soft-delete a workspace."""
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    ws.is_active = False
    db.commit()
    return None


# ─── Member Management ────────────────────────────────────────────────────────

@router.get("/{workspace_id}/members")
def list_members(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all members of a workspace."""
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    members_raw = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.is_active == True
    ).all()

    result = []
    for m in members_raw:
        user = db.query(User).filter(User.id == m.user_id).first()
        result.append({
            "id": m.id,
            "workspace_id": m.workspace_id,
            "user_id": m.user_id,
            "user_name": user.full_name if user else None,
            "user_email": user.email if user else None,
            "role": m.role,
            "is_active": m.is_active,
            "joined_at": m.joined_at,
        })
    return result


@router.post("/{workspace_id}/members", status_code=status.HTTP_201_CREATED)
def add_member(
    workspace_id: str,
    data: WorkspaceMemberInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Add a member to a workspace."""
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    user = db.query(User).filter(User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if already a member
    existing = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == data.user_id,
    ).first()
    if existing:
        existing.is_active = True
        existing.role = data.role
        db.commit()
        return {"message": "Member re-activated"}

    member = WorkspaceMember(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        user_id=data.user_id,
        role=data.role,
    )
    db.add(member)
    db.commit()
    return {"message": "Member added", "member_id": member.id}


@router.delete("/{workspace_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    workspace_id: str,
    member_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Remove a member from a workspace."""
    member = db.query(WorkspaceMember).filter(
        WorkspaceMember.id == member_id,
        WorkspaceMember.workspace_id == workspace_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    member.is_active = False
    db.commit()
    return None
