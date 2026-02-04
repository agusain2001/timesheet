from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import SupportRequest, User, SupportStatus
from app.schemas import SupportRequestCreate, SupportRequestUpdate, SupportRequestResponse
from app.utils import get_current_active_user
from app.services.notification_service import NotificationService

router = APIRouter()


@router.get("/", response_model=List[SupportRequestResponse])
def get_all_support_requests(
    skip: int = 0,
    limit: int = 100,
    user_id: str = None,
    status_filter: str = None,
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
    
    return query.order_by(SupportRequest.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/my", response_model=List[SupportRequestResponse])
def get_my_support_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's support requests."""
    return db.query(SupportRequest).filter(
        SupportRequest.user_id == current_user.id
    ).order_by(SupportRequest.created_at.desc()).all()


@router.post("/", response_model=SupportRequestResponse, status_code=status.HTTP_201_CREATED)
def create_support_request(
    request_data: SupportRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new support request."""
    db_request = SupportRequest(
        user_id=current_user.id,
        message=request_data.message
    )
    
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    
    # Notify support staff/admins
    admins = db.query(User).filter(User.role == "admin").all()
    for admin in admins:
        if admin.id != current_user.id:
            NotificationService.create_notification(
                db=db,
                user_id=admin.id,
                notification_type="system",
                title="New Support Request",
                message=f"{current_user.full_name} submitted a support request: {db_request.message[:50]}...",
                link=f"/support"
            )
            
    return db_request


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
    
    return request


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
        
    return request


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
