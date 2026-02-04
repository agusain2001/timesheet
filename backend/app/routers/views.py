"""Saved Views API router for view customization."""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from pydantic import BaseModel
import uuid
import json

from app.database import get_db
from app.models import User, SavedView, ViewShare
from app.utils import get_current_active_user

router = APIRouter()

# =============== Schemas ===============

class ViewColumn(BaseModel):
    id: str
    label: str
    visible: bool
    width: Optional[int] = None
    order: int

class ViewFilter(BaseModel):
    field: str
    operator: str  # equals, contains, gt, lt, gte, lte, in, not_in
    value: str | int | bool | List[str]

class ViewSort(BaseModel):
    field: str
    direction: str  # asc, desc

class ViewGrouping(BaseModel):
    field: str
    collapsed: Optional[List[str]] = None

class ViewShareResponse(BaseModel):
    user_id: str
    permission: str

class SavedViewResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    type: str  # list, kanban, timeline, calendar, swimlane
    is_default: bool
    is_shared: bool
    owner_id: str
    owner_name: Optional[str] = None
    columns: List[ViewColumn]
    filters: List[ViewFilter]
    sorts: List[ViewSort]
    grouping: Optional[ViewGrouping] = None
    color_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    shared_with: Optional[List[ViewShareResponse]] = None
    
    class Config:
        from_attributes = True

class CreateViewRequest(BaseModel):
    name: str
    description: Optional[str] = None
    type: str
    is_default: Optional[bool] = False
    is_shared: Optional[bool] = False
    columns: List[ViewColumn]
    filters: List[ViewFilter]
    sorts: List[ViewSort]
    grouping: Optional[ViewGrouping] = None
    color_by: Optional[str] = None

class UpdateViewRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_default: Optional[bool] = None
    is_shared: Optional[bool] = None
    columns: Optional[List[ViewColumn]] = None
    filters: Optional[List[ViewFilter]] = None
    sorts: Optional[List[ViewSort]] = None
    grouping: Optional[ViewGrouping] = None
    color_by: Optional[str] = None

class ShareViewRequest(BaseModel):
    user_ids: List[str]
    permission: str = "view"  # view, edit

# =============== Helper Functions ===============

def view_to_response(view: SavedView, owner_name: str = None) -> dict:
    """Convert SavedView model to response dict."""
    return {
        "id": view.id,
        "name": view.name,
        "description": view.description,
        "type": view.view_type,
        "is_default": view.is_default,
        "is_shared": view.is_shared,
        "owner_id": view.owner_id,
        "owner_name": owner_name,
        "columns": json.loads(view.columns_json) if view.columns_json else [],
        "filters": json.loads(view.filters_json) if view.filters_json else [],
        "sorts": json.loads(view.sorts_json) if view.sorts_json else [],
        "grouping": json.loads(view.grouping_json) if view.grouping_json else None,
        "color_by": view.color_by,
        "created_at": view.created_at,
        "updated_at": view.updated_at,
        "shared_with": [],
    }

# =============== Endpoints ===============

@router.get("/", response_model=List[SavedViewResponse])
def get_saved_views(
    type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all saved views for current user (owned + shared with them)."""
    # Get user's own views
    query = db.query(SavedView).filter(SavedView.owner_id == current_user.id)
    
    if type:
        query = query.filter(SavedView.view_type == type)
    
    views = query.order_by(desc(SavedView.is_default), SavedView.name).all()
    
    # Get shared views
    shared_query = db.query(SavedView).join(ViewShare).filter(
        ViewShare.user_id == current_user.id,
        SavedView.is_shared == True
    )
    if type:
        shared_query = shared_query.filter(SavedView.view_type == type)
    shared_views = shared_query.all()
    
    # Combine and return
    all_views = views + shared_views
    return [view_to_response(v, v.owner.full_name if v.owner else None) for v in all_views]


@router.get("/shared", response_model=List[SavedViewResponse])
def get_shared_views(
    type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get views shared with current user."""
    query = db.query(SavedView).join(ViewShare).filter(
        ViewShare.user_id == current_user.id,
        SavedView.is_shared == True
    )
    if type:
        query = query.filter(SavedView.view_type == type)
    
    views = query.all()
    return [view_to_response(v, v.owner.full_name if v.owner else None) for v in views]


@router.get("/{view_id}", response_model=SavedViewResponse)
def get_view_by_id(
    view_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific view by ID."""
    view = db.query(SavedView).filter(SavedView.id == view_id).first()
    
    if not view:
        raise HTTPException(status_code=404, detail="View not found")
    
    # Check access permission
    if view.owner_id != current_user.id:
        share = db.query(ViewShare).filter(
            ViewShare.view_id == view_id,
            ViewShare.user_id == current_user.id
        ).first()
        if not share and not view.is_shared:
            raise HTTPException(status_code=403, detail="Access denied")
    
    return view_to_response(view, view.owner.full_name if view.owner else None)


@router.post("/", response_model=SavedViewResponse, status_code=status.HTTP_201_CREATED)
def create_view(
    data: CreateViewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new saved view."""
    # If setting as default, unset other defaults of same type
    if data.is_default:
        db.query(SavedView).filter(
            SavedView.owner_id == current_user.id,
            SavedView.view_type == data.type,
            SavedView.is_default == True
        ).update({"is_default": False})
    
    view = SavedView(
        id=str(uuid.uuid4()),
        name=data.name,
        description=data.description,
        view_type=data.type,
        is_default=data.is_default or False,
        is_shared=data.is_shared or False,
        owner_id=current_user.id,
        columns_json=json.dumps([c.model_dump() for c in data.columns]),
        filters_json=json.dumps([f.model_dump() for f in data.filters]),
        sorts_json=json.dumps([s.model_dump() for s in data.sorts]),
        grouping_json=json.dumps(data.grouping.model_dump()) if data.grouping else None,
        color_by=data.color_by,
        created_at=datetime.utcnow(),
    )
    
    db.add(view)
    db.commit()
    db.refresh(view)
    
    return view_to_response(view, current_user.full_name)


@router.put("/{view_id}", response_model=SavedViewResponse)
def update_view(
    view_id: str,
    data: UpdateViewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an existing view."""
    view = db.query(SavedView).filter(SavedView.id == view_id).first()
    
    if not view:
        raise HTTPException(status_code=404, detail="View not found")
    
    # Check ownership or edit permission
    if view.owner_id != current_user.id:
        share = db.query(ViewShare).filter(
            ViewShare.view_id == view_id,
            ViewShare.user_id == current_user.id,
            ViewShare.permission == "edit"
        ).first()
        if not share:
            raise HTTPException(status_code=403, detail="Edit access denied")
    
    # Update fields
    if data.name is not None:
        view.name = data.name
    if data.description is not None:
        view.description = data.description
    if data.is_shared is not None:
        view.is_shared = data.is_shared
    if data.columns is not None:
        view.columns_json = json.dumps([c.model_dump() for c in data.columns])
    if data.filters is not None:
        view.filters_json = json.dumps([f.model_dump() for f in data.filters])
    if data.sorts is not None:
        view.sorts_json = json.dumps([s.model_dump() for s in data.sorts])
    if data.grouping is not None:
        view.grouping_json = json.dumps(data.grouping.model_dump())
    if data.color_by is not None:
        view.color_by = data.color_by
    
    # Handle default flag
    if data.is_default is not None and data.is_default:
        db.query(SavedView).filter(
            SavedView.owner_id == current_user.id,
            SavedView.view_type == view.view_type,
            SavedView.is_default == True,
            SavedView.id != view_id
        ).update({"is_default": False})
        view.is_default = True
    elif data.is_default is not None:
        view.is_default = False
    
    view.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(view)
    
    return view_to_response(view, view.owner.full_name if view.owner else None)


@router.delete("/{view_id}")
def delete_view(
    view_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a saved view."""
    view = db.query(SavedView).filter(SavedView.id == view_id).first()
    
    if not view:
        raise HTTPException(status_code=404, detail="View not found")
    
    if view.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can delete view")
    
    # Delete shares first
    db.query(ViewShare).filter(ViewShare.view_id == view_id).delete()
    
    db.delete(view)
    db.commit()
    
    return {"message": "View deleted successfully"}


@router.post("/{view_id}/set-default", response_model=SavedViewResponse)
def set_default_view(
    view_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Set a view as the default for its type."""
    view = db.query(SavedView).filter(SavedView.id == view_id).first()
    
    if not view:
        raise HTTPException(status_code=404, detail="View not found")
    
    if view.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can set default")
    
    # Unset other defaults
    db.query(SavedView).filter(
        SavedView.owner_id == current_user.id,
        SavedView.view_type == view.view_type,
        SavedView.is_default == True
    ).update({"is_default": False})
    
    view.is_default = True
    view.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(view)
    
    return view_to_response(view, current_user.full_name)


@router.post("/{view_id}/share", response_model=SavedViewResponse)
def share_view(
    view_id: str,
    data: ShareViewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Share a view with other users."""
    view = db.query(SavedView).filter(SavedView.id == view_id).first()
    
    if not view:
        raise HTTPException(status_code=404, detail="View not found")
    
    if view.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can share view")
    
    # Mark view as shared
    view.is_shared = True
    
    # Add shares
    for user_id in data.user_ids:
        existing = db.query(ViewShare).filter(
            ViewShare.view_id == view_id,
            ViewShare.user_id == user_id
        ).first()
        
        if existing:
            existing.permission = data.permission
        else:
            share = ViewShare(
                id=str(uuid.uuid4()),
                view_id=view_id,
                user_id=user_id,
                permission=data.permission,
                created_at=datetime.utcnow()
            )
            db.add(share)
    
    view.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(view)
    
    return view_to_response(view, current_user.full_name)


@router.post("/{view_id}/unshare", response_model=SavedViewResponse)
def unshare_view(
    view_id: str,
    user_ids: Optional[List[str]] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Remove sharing from a view."""
    view = db.query(SavedView).filter(SavedView.id == view_id).first()
    
    if not view:
        raise HTTPException(status_code=404, detail="View not found")
    
    if view.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can unshare view")
    
    if user_ids:
        db.query(ViewShare).filter(
            ViewShare.view_id == view_id,
            ViewShare.user_id.in_(user_ids)
        ).delete(synchronize_session=False)
    else:
        # Remove all shares
        db.query(ViewShare).filter(ViewShare.view_id == view_id).delete()
        view.is_shared = False
    
    view.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(view)
    
    return view_to_response(view, current_user.full_name)


@router.post("/{view_id}/duplicate", response_model=SavedViewResponse)
def duplicate_view(
    view_id: str,
    name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Duplicate a view."""
    view = db.query(SavedView).filter(SavedView.id == view_id).first()
    
    if not view:
        raise HTTPException(status_code=404, detail="View not found")
    
    # Check access
    if view.owner_id != current_user.id:
        share = db.query(ViewShare).filter(
            ViewShare.view_id == view_id,
            ViewShare.user_id == current_user.id
        ).first()
        if not share and not view.is_shared:
            raise HTTPException(status_code=403, detail="Access denied")
    
    new_view = SavedView(
        id=str(uuid.uuid4()),
        name=name or f"{view.name} (Copy)",
        description=view.description,
        view_type=view.view_type,
        is_default=False,
        is_shared=False,
        owner_id=current_user.id,
        columns_json=view.columns_json,
        filters_json=view.filters_json,
        sorts_json=view.sorts_json,
        grouping_json=view.grouping_json,
        color_by=view.color_by,
        created_at=datetime.utcnow(),
    )
    
    db.add(new_view)
    db.commit()
    db.refresh(new_view)
    
    return view_to_response(new_view, current_user.full_name)
