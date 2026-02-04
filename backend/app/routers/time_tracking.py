"""
Time Tracking Router
Timer-based and manual time logging with capacity planning.
"""
from typing import List, Optional
from datetime import datetime, timedelta, date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from app.database import get_db
from app.models import User, ActiveTimer, TimeLog, Capacity
from app.utils import get_current_active_user

router = APIRouter()


# =============== Schemas ===============

class TimerStartRequest(BaseModel):
    task_id: Optional[str] = None
    project_id: Optional[str] = None
    notes: Optional[str] = None


class ActiveTimerResponse(BaseModel):
    id: str
    user_id: str
    task_id: Optional[str] = None
    project_id: Optional[str] = None
    started_at: datetime
    notes: Optional[str] = None
    elapsed_seconds: int = 0

    class Config:
        from_attributes = True


class TimeLogResponse(BaseModel):
    id: str
    user_id: str
    task_id: Optional[str] = None
    project_id: Optional[str] = None
    date: datetime
    hours: float
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    notes: Optional[str] = None
    is_billable: bool = True

    class Config:
        from_attributes = True


class TimeLogCreate(BaseModel):
    task_id: Optional[str] = None
    project_id: Optional[str] = None
    date: date
    hours: float
    notes: Optional[str] = None
    is_billable: bool = True


class CapacityResponse(BaseModel):
    available_hours: float
    allocated_hours: float
    logged_hours: float
    utilization_percentage: float

    class Config:
        from_attributes = True


class WeeklyDay(BaseModel):
    date: str
    day_name: str
    total_hours: float


class WeeklyTimesheetResponse(BaseModel):
    week_start: str
    week_end: str
    total_hours: float
    expected_hours: float
    days: List[WeeklyDay]


# =============== Timer Endpoints ===============

@router.post("/timer/start", response_model=ActiveTimerResponse)
def start_timer(
    data: TimerStartRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Start a new timer for the current user."""
    # Check if user already has an active timer
    existing = db.query(ActiveTimer).filter(ActiveTimer.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Timer already running")
    
    timer = ActiveTimer(
        user_id=current_user.id,
        task_id=data.task_id if data else None,
        project_id=data.project_id if data else None,
        notes=data.notes if data else None,
        started_at=datetime.utcnow()
    )
    db.add(timer)
    db.commit()
    db.refresh(timer)
    
    # Add elapsed_seconds
    timer.elapsed_seconds = 0
    return timer


@router.post("/timer/stop", response_model=TimeLogResponse)
def stop_timer(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Stop the active timer and create a time log entry."""
    timer = db.query(ActiveTimer).filter(ActiveTimer.user_id == current_user.id).first()
    if not timer:
        raise HTTPException(status_code=404, detail="No active timer")
    
    ended_at = datetime.utcnow()
    elapsed_seconds = (ended_at - timer.started_at).total_seconds()
    hours = elapsed_seconds / 3600
    
    # Create time log
    time_log = TimeLog(
        user_id=current_user.id,
        task_id=timer.task_id,
        project_id=timer.project_id,
        date=timer.started_at.date(),
        hours=round(hours, 2),
        started_at=timer.started_at,
        ended_at=ended_at,
        notes=timer.notes,
        is_billable=True
    )
    db.add(time_log)
    
    # Delete the timer
    db.delete(timer)
    db.commit()
    db.refresh(time_log)
    
    return time_log


@router.get("/timer/active", response_model=Optional[ActiveTimerResponse])
def get_active_timer(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get the current active timer."""
    timer = db.query(ActiveTimer).filter(ActiveTimer.user_id == current_user.id).first()
    if not timer:
        return None
    
    elapsed_seconds = int((datetime.utcnow() - timer.started_at).total_seconds())
    timer.elapsed_seconds = elapsed_seconds
    return timer


@router.delete("/timer/discard", status_code=status.HTTP_204_NO_CONTENT)
def discard_timer(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Discard the active timer without saving."""
    timer = db.query(ActiveTimer).filter(ActiveTimer.user_id == current_user.id).first()
    if timer:
        db.delete(timer)
        db.commit()
    return None


# =============== Time Logs Endpoints ===============

@router.get("/logs", response_model=List[TimeLogResponse])
def get_time_logs(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    task_id: Optional[str] = None,
    project_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get time logs with optional filters."""
    query = db.query(TimeLog).filter(TimeLog.user_id == current_user.id)
    
    if date_from:
        query = query.filter(TimeLog.date >= date_from)
    if date_to:
        query = query.filter(TimeLog.date <= date_to)
    if task_id:
        query = query.filter(TimeLog.task_id == task_id)
    if project_id:
        query = query.filter(TimeLog.project_id == project_id)
    
    return query.order_by(TimeLog.date.desc()).offset(skip).limit(limit).all()


@router.post("/logs", response_model=TimeLogResponse, status_code=status.HTTP_201_CREATED)
def create_time_log(
    data: TimeLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a manual time log entry."""
    time_log = TimeLog(
        user_id=current_user.id,
        task_id=data.task_id,
        project_id=data.project_id,
        date=data.date,
        hours=data.hours,
        notes=data.notes,
        is_billable=data.is_billable
    )
    db.add(time_log)
    db.commit()
    db.refresh(time_log)
    return time_log


@router.delete("/logs/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_time_log(
    log_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a time log entry."""
    time_log = db.query(TimeLog).filter(
        TimeLog.id == log_id,
        TimeLog.user_id == current_user.id
    ).first()
    if not time_log:
        raise HTTPException(status_code=404, detail="Time log not found")
    
    db.delete(time_log)
    db.commit()
    return None


# =============== Capacity & Weekly Endpoints ===============

@router.get("/capacity", response_model=CapacityResponse)
def get_capacity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current week's capacity for the user."""
    today = datetime.utcnow().date()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    
    # Get logged hours for the week
    logged_hours = db.query(func.sum(TimeLog.hours)).filter(
        TimeLog.user_id == current_user.id,
        TimeLog.date >= week_start,
        TimeLog.date <= week_end
    ).scalar() or 0.0
    
    available_hours = current_user.capacity_hours_week or 40.0
    utilization = (logged_hours / available_hours * 100) if available_hours > 0 else 0
    
    return CapacityResponse(
        available_hours=available_hours,
        allocated_hours=0.0,  # TODO: Calculate from assigned tasks
        logged_hours=logged_hours,
        utilization_percentage=round(utilization, 1)
    )


@router.get("/weekly", response_model=WeeklyTimesheetResponse)
def get_weekly_timesheet(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get weekly timesheet breakdown."""
    today = datetime.utcnow().date()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    
    # Get time logs for the week
    logs = db.query(TimeLog).filter(
        TimeLog.user_id == current_user.id,
        TimeLog.date >= week_start,
        TimeLog.date <= week_end
    ).all()
    
    # Group by day
    days_data = {}
    for i in range(7):
        day_date = week_start + timedelta(days=i)
        days_data[day_date.isoformat()] = {
            "date": day_date.isoformat(),
            "day_name": day_date.strftime("%A"),
            "total_hours": 0.0
        }
    
    for log in logs:
        log_date = log.date.date() if isinstance(log.date, datetime) else log.date
        date_key = log_date.isoformat()
        if date_key in days_data:
            days_data[date_key]["total_hours"] += log.hours
    
    total_hours = sum(d["total_hours"] for d in days_data.values())
    
    return WeeklyTimesheetResponse(
        week_start=week_start.isoformat(),
        week_end=week_end.isoformat(),
        total_hours=round(total_hours, 2),
        expected_hours=current_user.capacity_hours_week or 40.0,
        days=list(days_data.values())
    )
