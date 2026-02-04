from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Timesheet, TimeEntry, User, TimesheetStatus
from app.schemas import TimesheetCreate, TimesheetUpdate, TimesheetResponse, TimeEntryCreate
from app.utils import get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[TimesheetResponse])
def get_all_timesheets(
    skip: int = 0,
    limit: int = 100,
    user_id: str = None,
    status_filter: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all timesheets with optional filters."""
    query = db.query(Timesheet)
    
    # Non-admins can only see their own
    if current_user.role not in ["admin", "manager"]:
        query = query.filter(Timesheet.user_id == current_user.id)
    elif user_id:
        query = query.filter(Timesheet.user_id == user_id)
    
    if status_filter:
        query = query.filter(Timesheet.status == status_filter)
    
    return query.order_by(Timesheet.week_starting.desc()).offset(skip).limit(limit).all()


@router.get("/my", response_model=List[TimesheetResponse])
def get_my_timesheets(
    status_filter: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's timesheets."""
    query = db.query(Timesheet).filter(Timesheet.user_id == current_user.id)
    
    if status_filter:
        query = query.filter(Timesheet.status == status_filter)
    
    return query.order_by(Timesheet.week_starting.desc()).all()


@router.post("/", response_model=TimesheetResponse, status_code=status.HTTP_201_CREATED)
def create_timesheet(
    timesheet_data: TimesheetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new timesheet."""
    # Check if timesheet exists for this week
    existing = db.query(Timesheet).filter(
        Timesheet.user_id == current_user.id,
        Timesheet.week_starting == timesheet_data.week_starting
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Timesheet already exists for this week"
        )
    
    db_timesheet = Timesheet(
        user_id=current_user.id,
        week_starting=timesheet_data.week_starting,
        achievement=timesheet_data.achievement
    )
    
    db.add(db_timesheet)
    db.flush()
    
    # Add entries if provided
    total_hours = 0.0
    if timesheet_data.entries:
        for entry_data in timesheet_data.entries:
            entry = TimeEntry(
                timesheet_id=db_timesheet.id,
                **entry_data.model_dump()
            )
            db.add(entry)
            total_hours += entry.hours
    
    db_timesheet.total_hours = total_hours
    db.commit()
    db.refresh(db_timesheet)
    return db_timesheet


@router.get("/{timesheet_id}", response_model=TimesheetResponse)
def get_timesheet(
    timesheet_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific timesheet by ID."""
    timesheet = db.query(Timesheet).filter(Timesheet.id == timesheet_id).first()
    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    
    # Check access
    if current_user.role not in ["admin", "manager"] and timesheet.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return timesheet


@router.put("/{timesheet_id}", response_model=TimesheetResponse)
def update_timesheet(
    timesheet_id: str,
    timesheet_data: TimesheetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a timesheet."""
    timesheet = db.query(Timesheet).filter(Timesheet.id == timesheet_id).first()
    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    
    # Only owner can update draft, managers can approve/reject
    if timesheet.user_id != current_user.id and current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if timesheet_data.achievement is not None:
        timesheet.achievement = timesheet_data.achievement
    
    if timesheet_data.status is not None:
        # Handle status transitions
        if timesheet_data.status == "submitted":
            timesheet.submitted_at = datetime.utcnow()
        elif timesheet_data.status == "approved":
            timesheet.approved_at = datetime.utcnow()
        timesheet.status = timesheet_data.status
    
    # Update entries if provided
    if timesheet_data.entries is not None:
        # Delete existing entries
        db.query(TimeEntry).filter(TimeEntry.timesheet_id == timesheet_id).delete()
        
        # Add new entries
        total_hours = 0.0
        for entry_data in timesheet_data.entries:
            entry = TimeEntry(
                timesheet_id=timesheet.id,
                **entry_data.model_dump()
            )
            db.add(entry)
            total_hours += entry.hours
        
        timesheet.total_hours = total_hours
    
    db.commit()
    db.refresh(timesheet)
    return timesheet


@router.post("/{timesheet_id}/submit", response_model=TimesheetResponse)
def submit_timesheet(
    timesheet_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Submit a timesheet for approval."""
    timesheet = db.query(Timesheet).filter(Timesheet.id == timesheet_id).first()
    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    
    if timesheet.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if timesheet.status != TimesheetStatus.DRAFT.value:
        raise HTTPException(status_code=400, detail="Can only submit draft timesheets")
    
    timesheet.status = TimesheetStatus.SUBMITTED.value
    timesheet.submitted_at = datetime.utcnow()
    
    db.commit()
    db.refresh(timesheet)
    return timesheet


@router.delete("/{timesheet_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_timesheet(
    timesheet_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a timesheet (draft only)."""
    timesheet = db.query(Timesheet).filter(Timesheet.id == timesheet_id).first()
    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    
    if timesheet.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if timesheet.status != TimesheetStatus.DRAFT.value:
        raise HTTPException(status_code=400, detail="Can only delete draft timesheets")
    
    db.delete(timesheet)
    db.commit()
    return None
