import json
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import SupportRequest, User, SupportStatus
from app.schemas import (
    SupportRequestCreate, SupportRequestUpdate, SupportRequestResponse, UserBrief
)
from app.utils import get_current_active_user
from app.services.notification_service import NotificationService

router = APIRouter()


@router.get("/", response_model=List[SupportRequestResponse])
def get_all_support_requests(
    skip: int = 0,
    limit: int = 100,
    user_id: str = None,
    status_filter: str = None,
    priority: str = None,
    is_draft: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all support requests with optional filters."""
    query = db.query(SupportRequest)
    
    # Non-admins see only their own
    if current_user.role not in ["admin", "manager"]:
        query = query.filter(SupportRequest.user_id == current_user.id)
    elif user_id:
        query = query.filter(SupportRequest.user_id == user_id)
    
    if status_filter:
        query = query.filter(SupportRequest.status == status_filter)
    
    if priority:
        query = query.filter(SupportRequest.priority == priority)
    
    if is_draft is not None:
        query = query.filter(SupportRequest.is_draft == is_draft)
    
    results = query.order_by(SupportRequest.created_at.desc()).offset(skip).limit(limit).all()
    
    # Build response with user info and parsed recipient_ids
    response_list = []
    for req in results:
        resp = SupportRequestResponse.model_validate(req)
        # Parse recipient_ids from JSON string
        if req.recipient_ids:
            try:
                resp.recipient_ids = json.loads(req.recipient_ids)
            except (json.JSONDecodeError, TypeError):
                resp.recipient_ids = []
        # Load user info
        if req.user:
            resp.user = UserBrief.model_validate(req.user)
        response_list.append(resp)
    
    return response_list


@router.get("/my", response_model=List[SupportRequestResponse])
def get_my_support_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's support requests."""
    results = db.query(SupportRequest).filter(
        SupportRequest.user_id == current_user.id
    ).order_by(SupportRequest.created_at.desc()).all()
    
    response_list = []
    for req in results:
        resp = SupportRequestResponse.model_validate(req)
        if req.recipient_ids:
            try:
                resp.recipient_ids = json.loads(req.recipient_ids)
            except (json.JSONDecodeError, TypeError):
                resp.recipient_ids = []
        if req.user:
            resp.user = UserBrief.model_validate(req.user)
        response_list.append(resp)
    
    return response_list


@router.get("/users-list", response_model=List[UserBrief])
def get_support_users(
    search: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get available users for recipient selection in support requests."""
    query = db.query(User).filter(User.is_active == True, User.id != current_user.id)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (User.full_name.ilike(search_term)) |
            (User.email.ilike(search_term))
        )
    
    users = query.order_by(User.full_name).limit(50).all()
    return [UserBrief.model_validate(u) for u in users]


@router.post("/", response_model=SupportRequestResponse, status_code=status.HTTP_201_CREATED)
def create_support_request(
    request_data: SupportRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new support request."""
    db_request = SupportRequest(
        user_id=current_user.id,
        message=request_data.message,
        subject=request_data.subject,
        priority=request_data.priority or "normal",
        related_module=request_data.related_module,
        image_url=request_data.image_url,
        is_draft=request_data.is_draft,
        recipient_ids=json.dumps(request_data.recipient_ids) if request_data.recipient_ids else None,
    )
    
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    
    # Only notify if not a draft
    if not request_data.is_draft:
        # Notify specific recipients or admins
        notify_user_ids = request_data.recipient_ids or []
        if not notify_user_ids:
            admins = db.query(User).filter(User.role == "admin").all()
            notify_user_ids = [a.id for a in admins]
        
        for uid in notify_user_ids:
            if uid != current_user.id:
                NotificationService.create_notification(
                    db=db,
                    user_id=uid,
                    notification_type="system",
                    title="New Support Request",
                    message=f"{current_user.full_name}: {request_data.subject or request_data.message[:50]}...",
                    link="/support"
                )
    
    # Build response
    resp = SupportRequestResponse.model_validate(db_request)
    if db_request.recipient_ids:
        try:
            resp.recipient_ids = json.loads(db_request.recipient_ids)
        except (json.JSONDecodeError, TypeError):
            resp.recipient_ids = []
    if db_request.user:
        resp.user = UserBrief.model_validate(db_request.user)
    
    return resp


@router.get("/{request_id}", response_model=SupportRequestResponse)
def get_support_request(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific support request by ID."""
    request = db.query(SupportRequest).filter(SupportRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Support request not found")
    
    # Check access
    if current_user.role not in ["admin", "manager"] and request.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    resp = SupportRequestResponse.model_validate(request)
    if request.recipient_ids:
        try:
            resp.recipient_ids = json.loads(request.recipient_ids)
        except (json.JSONDecodeError, TypeError):
            resp.recipient_ids = []
    if request.user:
        resp.user = UserBrief.model_validate(request.user)
    
    return resp


@router.put("/{request_id}", response_model=SupportRequestResponse)
def update_support_request(
    request_id: str,
    request_data: SupportRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a support request."""
    request = db.query(SupportRequest).filter(SupportRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Support request not found")
    
    if request_data.message is not None:
        request.message = request_data.message
    if request_data.subject is not None:
        request.subject = request_data.subject
    if request_data.priority is not None:
        request.priority = request_data.priority
    if request_data.related_module is not None:
        request.related_module = request_data.related_module
    if request_data.image_url is not None:
        request.image_url = request_data.image_url
    if request_data.is_draft is not None:
        request.is_draft = request_data.is_draft
    if request_data.recipient_ids is not None:
        request.recipient_ids = json.dumps(request_data.recipient_ids)
    if request_data.status is not None:
        if request_data.status == SupportStatus.RESOLVED.value:
            request.resolved_at = datetime.utcnow()
        request.status = request_data.status
    
    db.commit()
    db.refresh(request)
    
    # Notify user if status changed
    if request_data.status and request.user_id != current_user.id:
        NotificationService.create_notification(
            db=db,
            user_id=request.user_id,
            notification_type="system",
            title="Support Request Updated",
            message=f"Your support request status has been updated to {request.status}",
            link="/support"
        )
    
    resp = SupportRequestResponse.model_validate(request)
    if request.recipient_ids:
        try:
            resp.recipient_ids = json.loads(request.recipient_ids)
        except (json.JSONDecodeError, TypeError):
            resp.recipient_ids = []
    if request.user:
        resp.user = UserBrief.model_validate(request.user)
    
    return resp


@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_support_request(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a support request."""
    request = db.query(SupportRequest).filter(SupportRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Support request not found")
    
    if request.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db.delete(request)
    db.commit()
    return None
