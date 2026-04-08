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
from app.models import Task, Timesheet, TimeEntry, User, Department, TaskStatus, Project, TimeLog, ProjectManager
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
    due_tasks_count: int
    overdue_tasks_count: int
    completed_today_count: int
    completed_tasks_count: int
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
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get comprehensive personal dashboard data.
    
    Optional query parameters:
    - start_date: Filter tasks starting from this date (YYYY-MM-DD)
    - end_date: Filter tasks up to this date (YYYY-MM-DD). Defaults to start_date if not provided.
    """
    try:
        today = datetime.utcnow().date()
        now = datetime.utcnow()
        week_start = today - timedelta(days=today.weekday())

        # Resolve date window for filtering
        filter_start: Optional[datetime] = None
        filter_end: Optional[datetime] = None
        if start_date:
            effective_end = end_date if end_date else start_date
            filter_start = datetime.combine(start_date, datetime.min.time())
            filter_end = datetime.combine(effective_end, datetime.max.time())

        def date_window_filters(query, date_field):
            """Apply date window to a query on a given date column."""
            if filter_start and filter_end:
                query = query.filter(date_field >= filter_start, date_field <= filter_end)
            return query

        # Base task filter (always scoped to the current user)
        base_q = db.query(Task).filter(Task.assignee_id == current_user.id)
        if search:
            search_term = f"%{search.lower()}%"
            base_q = base_q.filter(
                or_(
                    func.lower(Task.name).like(search_term),
                    func.lower(Task.description).like(search_term)
                )
            )

        # My Tasks count
        if filter_start and filter_end:
            my_tasks_count = base_q.filter(
                or_(
                    and_(Task.created_at >= filter_start, Task.created_at <= filter_end),
                    and_(Task.due_date >= filter_start, Task.due_date <= filter_end)
                )
            ).count()
        else:
            my_tasks_count = base_q.count()

        # Tasks due today (always today regardless of filter, for contextual info)
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        today_tasks_count = db.query(Task).filter(
            Task.assignee_id == current_user.id,
            Task.due_date >= today_start,
            Task.due_date <= today_end,
            Task.status != TaskStatus.COMPLETED.value
        ).count()

        # Due tasks (non-completed, non-overdue, non-cancelled)
        due_q = base_q.filter(
            Task.status != TaskStatus.COMPLETED.value,
            Task.status != TaskStatus.OVERDUE.value,
            Task.status != TaskStatus.CANCELLED.value
        )
        if filter_start and filter_end:
            due_q = due_q.filter(
                or_(
                    and_(Task.created_at >= filter_start, Task.created_at <= filter_end),
                    and_(Task.due_date >= filter_start, Task.due_date <= filter_end)
                )
            )
        due_tasks_count = due_q.count()

        # Overdue tasks
        overdue_q = base_q.filter(Task.status == TaskStatus.OVERDUE.value)
        if filter_start and filter_end:
            overdue_q = overdue_q.filter(
                or_(
                    and_(Task.created_at >= filter_start, Task.created_at <= filter_end),
                    and_(Task.due_date >= filter_start, Task.due_date <= filter_end)
                )
            )
        overdue_tasks_count = overdue_q.count()

        # Completed tasks
        completed_q = base_q.filter(Task.status == TaskStatus.COMPLETED.value)
        if filter_start and filter_end:
            completed_q = completed_q.filter(
                or_(
                    and_(Task.completed_at >= filter_start, Task.completed_at <= filter_end),
                    and_(Task.created_at >= filter_start, Task.created_at <= filter_end)
                )
            )
        completed_tasks_count = completed_q.count()

        # Completed today (for time status section, always "today")
        completed_today_count = db.query(Task).filter(
            Task.assignee_id == current_user.id,
            Task.status == TaskStatus.COMPLETED.value,
            func.date(Task.completed_at) == today
        ).count()

        # Upcoming deadlines (next 5 tasks due — show within 30 days by default)
        try:
            from sqlalchemy.orm import joinedload as _jl
            deadline_q = db.query(Task).options(_jl(Task.project)).filter(
                Task.assignee_id == current_user.id,
                Task.status != TaskStatus.COMPLETED.value,
                Task.status != TaskStatus.CANCELLED.value if hasattr(TaskStatus, 'CANCELLED') else True,
                Task.due_date != None,
            )
            if filter_start and filter_end:
                deadline_q = deadline_q.filter(
                    Task.due_date >= filter_start,
                    Task.due_date <= filter_end
                )
            else:
                # Widen window to 30 days to show more upcoming items
                look_back = now - timedelta(days=1)  # include today's tasks
                deadline_q = deadline_q.filter(
                    Task.due_date >= look_back,
                    Task.due_date <= now + timedelta(days=30)
                )
            upcoming_tasks = deadline_q.order_by(Task.due_date.asc()).limit(10).all()

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
        except Exception as deadline_err:
            import logging
            logging.warning(f"Upcoming deadlines error: {deadline_err}")
            upcoming_deadlines = []

        # Hours logged today
        try:
            hours_logged_today = db.query(func.sum(TimeLog.hours)).filter(
                TimeLog.user_id == current_user.id,
                func.date(TimeLog.date) == today
            ).scalar() or 0.0

            timeentry_today = db.query(func.sum(TimeEntry.hours)).join(Timesheet).filter(
                Timesheet.user_id == current_user.id,
                TimeEntry.day == today
            ).scalar() or 0.0

            hours_logged_today = float(hours_logged_today) + float(timeentry_today)
        except Exception:
            hours_logged_today = 0.0

        # Hours logged this week
        try:
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
        except Exception:
            hours_logged_this_week = 0.0

        # Tasks by status
        try:
            status_q = db.query(Task.status, func.count(Task.id)).filter(
                Task.assignee_id == current_user.id
            )
            if filter_start and filter_end:
                status_q = status_q.filter(
                    or_(
                        and_(Task.created_at >= filter_start, Task.created_at <= filter_end),
                        and_(Task.due_date >= filter_start, Task.due_date <= filter_end)
                    )
                )
            status_counts = status_q.group_by(Task.status).all()

            # Collect ALL statuses dynamically — don't restrict to a fixed list
            tasks_by_status: dict = {}
            for status, count in status_counts:
                if status:
                    status_key = status.lower().replace(" ", "_")
                    tasks_by_status[status_key] = tasks_by_status.get(status_key, 0) + count

            # Ensure at least canonical keys exist with 0 so the frontend doesn't break
            for key in ("todo", "in_progress", "review", "completed", "blocked"):
                tasks_by_status.setdefault(key, 0)
        except Exception:
            tasks_by_status = {"todo": 0, "in_progress": 0, "review": 0, "completed": 0, "blocked": 0}

        # Recent activity
        try:
            completed_q2 = db.query(Task).filter(
                Task.assignee_id == current_user.id,
                Task.completed_at != None
            )
            created_q2 = db.query(Task).filter(
                Task.assignee_id == current_user.id
            )
            if filter_start and filter_end:
                completed_q2 = completed_q2.filter(
                    Task.completed_at >= filter_start,
                    Task.completed_at <= filter_end
                )
                created_q2 = created_q2.filter(
                    Task.created_at >= filter_start,
                    Task.created_at <= filter_end
                )

            recent_completed = completed_q2.order_by(Task.completed_at.desc()).limit(5).all()
            recent_created = created_q2.order_by(Task.created_at.desc()).limit(5).all()

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

            activities.sort(key=lambda x: x.timestamp, reverse=True)
            recent_activity = activities[:5]
        except Exception:
            recent_activity = []

        return PersonalDashboardResponse(
            my_tasks_count=my_tasks_count,
            today_tasks_count=today_tasks_count,
            due_tasks_count=due_tasks_count,
            overdue_tasks_count=overdue_tasks_count,
            completed_today_count=completed_today_count,
            completed_tasks_count=completed_tasks_count,
            upcoming_deadlines=upcoming_deadlines,
            hours_logged_today=round(hours_logged_today, 1),
            hours_logged_this_week=round(hours_logged_this_week, 1),
            tasks_by_status=tasks_by_status,
            recent_activity=recent_activity
        )
    except Exception as e:
        import logging
        logging.error(f"Personal dashboard error: {e}", exc_info=True)
        return PersonalDashboardResponse(
            my_tasks_count=0,
            today_tasks_count=0,
            due_tasks_count=0,
            overdue_tasks_count=0,
            completed_today_count=0,
            completed_tasks_count=0,
            upcoming_deadlines=[],
            hours_logged_today=0.0,
            hours_logged_this_week=0.0,
            tasks_by_status={"todo": 0, "in_progress": 0, "review": 0, "completed": 0, "blocked": 0},
            recent_activity=[]
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


# =============== Executive Drill-down ===============


@router.get("/executive/project/{project_id}/summary")
def get_executive_project_summary(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get project summary with task breakdown, team members, and activity for executive drill-down."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    now = datetime.utcnow()

    # Task counts by status
    status_counts = db.query(
        Task.status, func.count(Task.id)
    ).filter(
        Task.project_id == project_id
    ).group_by(Task.status).all()

    tasks_by_status = {}
    total_tasks = 0
    completed_tasks = 0
    for status, count in status_counts:
        tasks_by_status[status or "todo"] = count
        total_tasks += count
        if status in ["done", "completed"]:
            completed_tasks += count

    progress = round(completed_tasks / total_tasks * 100, 1) if total_tasks > 0 else 0

    # Overdue tasks
    overdue_count = db.query(Task).filter(
        Task.project_id == project_id,
        Task.status.notin_(["done", "completed", "cancelled"]),
        Task.due_date < now
    ).count()

    # Team members (managers + task assignees)
    manager_records = db.query(ProjectManager).filter(
        ProjectManager.project_id == project_id
    ).all()

    manager_user_ids = [str(pm.user_id) for pm in manager_records]

    assignee_ids = db.query(Task.assignee_id).filter(
        Task.project_id == project_id,
        Task.assignee_id != None
    ).distinct().all()
    assignee_ids = [str(a[0]) for a in assignee_ids]

    all_member_ids = list(set(manager_user_ids + assignee_ids))
    members = db.query(User).filter(User.id.in_(all_member_ids)).all() if all_member_ids else []

    team_members = []
    for m in members:
        is_mgr = str(m.id) in manager_user_ids
        task_count = db.query(Task).filter(
            Task.project_id == project_id,
            Task.assignee_id == m.id
        ).count()
        team_members.append({
            "id": str(m.id),
            "full_name": m.full_name,
            "email": m.email,
            "role": "Manager" if is_mgr else "Member",
            "avatar_url": m.avatar_url,
            "task_count": task_count,
        })

    # Recent tasks (latest 10 updated)
    recent_tasks = db.query(Task).filter(
        Task.project_id == project_id
    ).order_by(Task.updated_at.desc()).limit(10).all()

    recent_list = [{
        "id": str(t.id),
        "name": t.name,
        "status": t.status,
        "priority": t.priority,
        "due_date": t.due_date.isoformat() if t.due_date else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    } for t in recent_tasks]

    return {
        "project": {
            "id": str(project.id),
            "name": project.name,
            "code": project.code,
            "description": project.description,
            "status": project.status,
            "priority": project.priority,
            "start_date": project.start_date.isoformat() if project.start_date else None,
            "end_date": project.end_date.isoformat() if project.end_date else None,
            "budget": project.budget,
            "actual_cost": project.actual_cost,
            "progress": progress,
        },
        "tasks_by_status": tasks_by_status,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "overdue_tasks": overdue_count,
        "team_members": team_members,
        "recent_tasks": recent_list,
    }
