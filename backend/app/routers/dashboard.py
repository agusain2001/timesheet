"""
Dashboard Router
Personal, Manager, and Executive dashboards with real database data.
"""
from typing import List, Optional
from datetime import datetime, timedelta, date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, and_, or_
from pydantic import BaseModel
from app.database import get_db
from app.models import Task, Timesheet, TimeEntry, User, Department, TaskStatus, Project, TimeLog
from app.utils import get_current_active_user

router = APIRouter()


# =============== Schemas ===============

class UpcomingDeadline(BaseModel):
    task_id: str
    task_name: str
    due_date: str
    priority: str
    project_name: Optional[str] = None


class RecentActivity(BaseModel):
    id: str
    type: str
    message: str
    timestamp: str
    link: Optional[str] = None


class PersonalDashboardResponse(BaseModel):
    my_tasks_count: int
    today_tasks_count: int
    overdue_tasks_count: int
    completed_today_count: int
    upcoming_deadlines: List[UpcomingDeadline]
    hours_logged_today: float
    hours_logged_this_week: float
    tasks_by_status: dict
    recent_activity: List[RecentActivity]
    
    class Config:
        from_attributes = True


class TodayStatsResponse(BaseModel):
    tasks_due_today: int
    tasks_completed_today: int
    hours_logged_today: float
    meetings_today: int
    unread_notifications: int


class WeeklySummaryResponse(BaseModel):
    week_starting: str
    tasks_completed: int
    tasks_created: int
    hours_logged: float
    productivity_score: float
    productivity_trend: str


# =============== Personal Dashboard ===============

@router.get("/personal", response_model=PersonalDashboardResponse)
def get_personal_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get comprehensive personal dashboard data."""
    today = datetime.utcnow().date()
    now = datetime.utcnow()
    week_start = today - timedelta(days=today.weekday())
    
    # My Tasks count (all non-completed tasks assigned to me)
    my_tasks_count = db.query(Task).filter(
        Task.assignee_id == current_user.id,
        Task.status != TaskStatus.COMPLETED.value
    ).count()
    
    # Tasks due today
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    today_tasks_count = db.query(Task).filter(
        Task.assignee_id == current_user.id,
        Task.due_date >= today_start,
        Task.due_date <= today_end,
        Task.status != TaskStatus.COMPLETED.value
    ).count()
    
    # Overdue tasks
    overdue_tasks_count = db.query(Task).filter(
        Task.assignee_id == current_user.id,
        Task.status != TaskStatus.COMPLETED.value,
        Task.due_date < now
    ).count()
    
    # Completed today
    completed_today_count = db.query(Task).filter(
        Task.assignee_id == current_user.id,
        Task.status == TaskStatus.COMPLETED.value,
        func.date(Task.completed_at) == today
    ).count()
    
    # Upcoming deadlines (next 5 tasks due within 7 days)
    upcoming_tasks = db.query(Task).options(
        joinedload(Task.project)
    ).filter(
        Task.assignee_id == current_user.id,
        Task.status != TaskStatus.COMPLETED.value,
        Task.due_date != None,
        Task.due_date >= now,
        Task.due_date <= now + timedelta(days=7)
    ).order_by(Task.due_date.asc()).limit(5).all()
    
    upcoming_deadlines = [
        UpcomingDeadline(
            task_id=str(t.id),
            task_name=t.name,
            due_date=t.due_date.isoformat() if t.due_date else "",
            priority=t.priority or "medium",
            project_name=t.project.name if t.project else None
        )
        for t in upcoming_tasks
    ]
    
    # Hours logged today - from TimeLog table
    hours_logged_today = db.query(func.sum(TimeLog.hours)).filter(
        TimeLog.user_id == current_user.id,
        func.date(TimeLog.date) == today
    ).scalar() or 0.0
    
    # Also check TimeEntry for backward compatibility
    timeentry_today = db.query(func.sum(TimeEntry.hours)).join(Timesheet).filter(
        Timesheet.user_id == current_user.id,
        TimeEntry.day == today
    ).scalar() or 0.0
    
    hours_logged_today = float(hours_logged_today) + float(timeentry_today)
    
    # Hours logged this week
    hours_logged_this_week = db.query(func.sum(TimeLog.hours)).filter(
        TimeLog.user_id == current_user.id,
        func.date(TimeLog.date) >= week_start,
        func.date(TimeLog.date) <= today
    ).scalar() or 0.0
    
    timeentry_week = db.query(func.sum(TimeEntry.hours)).join(Timesheet).filter(
        Timesheet.user_id == current_user.id,
        TimeEntry.day >= week_start,
        TimeEntry.day <= today
    ).scalar() or 0.0
    
    hours_logged_this_week = float(hours_logged_this_week) + float(timeentry_week)
    
    # Tasks by status
    status_counts = db.query(
        Task.status, func.count(Task.id)
    ).filter(
        Task.assignee_id == current_user.id
    ).group_by(Task.status).all()
    
    tasks_by_status = {
        "todo": 0,
        "in_progress": 0,
        "review": 0,
        "completed": 0,
        "blocked": 0
    }
    for status, count in status_counts:
        if status:
            status_key = status.lower().replace(" ", "_")
            if status_key in tasks_by_status:
                tasks_by_status[status_key] = count
    
    # Recent activity (last 10 activities)
    recent_completed = db.query(Task).filter(
        Task.assignee_id == current_user.id,
        Task.completed_at != None
    ).order_by(Task.completed_at.desc()).limit(5).all()
    
    recent_created = db.query(Task).filter(
        Task.assignee_id == current_user.id
    ).order_by(Task.created_at.desc()).limit(5).all()
    
    activities = []
    for task in recent_completed:
        activities.append(RecentActivity(
            id=str(task.id),
            type="task_completed",
            message=f"Completed '{task.name}'",
            timestamp=task.completed_at.isoformat() if task.completed_at else now.isoformat()
        ))
    
    for task in recent_created:
        activities.append(RecentActivity(
            id=f"created_{task.id}",
            type="task_created",
            message=f"Created '{task.name}'",
            timestamp=task.created_at.isoformat() if task.created_at else now.isoformat()
        ))
    
    # Sort by timestamp and take latest 5
    activities.sort(key=lambda x: x.timestamp, reverse=True)
    recent_activity = activities[:5]
    
    return PersonalDashboardResponse(
        my_tasks_count=my_tasks_count,
        today_tasks_count=today_tasks_count,
        overdue_tasks_count=overdue_tasks_count,
        completed_today_count=completed_today_count,
        upcoming_deadlines=upcoming_deadlines,
        hours_logged_today=round(hours_logged_today, 1),
        hours_logged_this_week=round(hours_logged_this_week, 1),
        tasks_by_status=tasks_by_status,
        recent_activity=recent_activity
    )


@router.get("/today", response_model=TodayStatsResponse)
def get_today_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get today's quick stats."""
    today = datetime.utcnow().date()
    now = datetime.utcnow()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    
    # Tasks due today
    tasks_due_today = db.query(Task).filter(
        Task.assignee_id == current_user.id,
        Task.due_date >= today_start,
        Task.due_date <= today_end,
        Task.status != TaskStatus.COMPLETED.value
    ).count()
    
    # Tasks completed today
    tasks_completed_today = db.query(Task).filter(
        Task.assignee_id == current_user.id,
        Task.status == TaskStatus.COMPLETED.value,
        func.date(Task.completed_at) == today
    ).count()
    
    # Hours logged today
    hours_logged = db.query(func.sum(TimeLog.hours)).filter(
        TimeLog.user_id == current_user.id,
        func.date(TimeLog.date) == today
    ).scalar() or 0.0
    
    return TodayStatsResponse(
        tasks_due_today=tasks_due_today,
        tasks_completed_today=tasks_completed_today,
        hours_logged_today=round(float(hours_logged), 1),
        meetings_today=0,  # TODO: Implement when calendar is integrated
        unread_notifications=0  # TODO: Get from notifications table
    )


@router.get("/weekly-summary", response_model=WeeklySummaryResponse)
def get_weekly_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get weekly summary stats."""
    today = datetime.utcnow().date()
    week_start = today - timedelta(days=today.weekday())
    last_week_start = week_start - timedelta(days=7)
    
    # Tasks completed this week
    tasks_completed = db.query(Task).filter(
        Task.assignee_id == current_user.id,
        Task.status == TaskStatus.COMPLETED.value,
        func.date(Task.completed_at) >= week_start
    ).count()
    
    # Tasks created this week
    tasks_created = db.query(Task).filter(
        Task.assignee_id == current_user.id,
        func.date(Task.created_at) >= week_start
    ).count()
    
    # Hours logged this week
    hours_logged = db.query(func.sum(TimeLog.hours)).filter(
        TimeLog.user_id == current_user.id,
        func.date(TimeLog.date) >= week_start
    ).scalar() or 0.0
    
    # Calculate productivity score (tasks completed / expected * 100)
    expected_hours = current_user.capacity_hours_week or 40.0
    productivity_score = min((float(hours_logged) / expected_hours) * 100, 100) if expected_hours > 0 else 0
    
    # Calculate trend by comparing to last week
    last_week_completed = db.query(Task).filter(
        Task.assignee_id == current_user.id,
        Task.status == TaskStatus.COMPLETED.value,
        func.date(Task.completed_at) >= last_week_start,
        func.date(Task.completed_at) < week_start
    ).count()
    
    if tasks_completed > last_week_completed:
        productivity_trend = "up"
    elif tasks_completed < last_week_completed:
        productivity_trend = "down"
    else:
        productivity_trend = "stable"
    
    return WeeklySummaryResponse(
        week_starting=week_start.isoformat(),
        tasks_completed=tasks_completed,
        tasks_created=tasks_created,
        hours_logged=round(float(hours_logged), 1),
        productivity_score=round(productivity_score, 1),
        productivity_trend=productivity_trend
    )


# =============== Charts Data ===============

@router.get("/charts/task-completion")
def get_task_completion_trends(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get task completion trends for chart."""
    today = datetime.utcnow().date()
    start_date = today - timedelta(days=days-1)
    
    result = []
    for i in range(days):
        day_date = start_date + timedelta(days=i)
        
        created = db.query(Task).filter(
            Task.assignee_id == current_user.id,
            func.date(Task.created_at) == day_date
        ).count()
        
        completed = db.query(Task).filter(
            Task.assignee_id == current_user.id,
            func.date(Task.completed_at) == day_date
        ).count()
        
        result.append({
            "date": day_date.isoformat(),
            "created": created,
            "completed": completed
        })
    
    return result


@router.get("/charts/time-logged")
def get_time_logged_trends(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get time logged trends for chart."""
    today = datetime.utcnow().date()
    start_date = today - timedelta(days=days-1)
    
    result = []
    for i in range(days):
        day_date = start_date + timedelta(days=i)
        
        hours = db.query(func.sum(TimeLog.hours)).filter(
            TimeLog.user_id == current_user.id,
            func.date(TimeLog.date) == day_date
        ).scalar() or 0.0
        
        result.append({
            "date": day_date.isoformat(),
            "hours": round(float(hours), 1)
        })
    
    return result


@router.get("/charts/priority-distribution")
def get_priority_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get tasks by priority distribution."""
    counts = db.query(
        Task.priority, func.count(Task.id)
    ).filter(
        Task.assignee_id == current_user.id,
        Task.status != TaskStatus.COMPLETED.value
    ).group_by(Task.priority).all()
    
    return {priority or "medium": count for priority, count in counts}


@router.get("/charts/status-distribution")
def get_status_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get tasks by status distribution."""
    counts = db.query(
        Task.status, func.count(Task.id)
    ).filter(
        Task.assignee_id == current_user.id
    ).group_by(Task.status).all()
    
    return {status or "todo": count for status, count in counts}


# =============== Legacy Stats Endpoint ===============

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get dashboard statistics (legacy endpoint)."""
    today = datetime.utcnow().date()
    week_start = today - timedelta(days=today.weekday())
    
    # Task statistics
    total_tasks = db.query(Task).filter(Task.assignee_id == current_user.id).count()
    
    completed_today = db.query(Task).filter(
        Task.assignee_id == current_user.id,
        Task.status == TaskStatus.COMPLETED.value,
        func.date(Task.completed_at) == today
    ).count()
    
    overdue_tasks = db.query(Task).filter(
        Task.assignee_id == current_user.id,
        Task.status != TaskStatus.COMPLETED.value,
        Task.due_date < datetime.utcnow()
    ).count()
    
    # Calculate total hours this week
    total_hours_this_week = db.query(func.sum(TimeLog.hours)).filter(
        TimeLog.user_id == current_user.id,
        func.date(TimeLog.date) >= week_start
    ).scalar() or 0.0
    
    return {
        "total_tasks": total_tasks,
        "completed_today": completed_today,
        "overdue_tasks": overdue_tasks,
        "total_hours_this_week": round(float(total_hours_this_week), 1),
        "avg_daily_tasks": 0,
        "current_streak": 0,
        "managed_employees": 0,
        "total_assigned": 0,
        "avg_workload": 0,
        "departments": 0
    }
