"""Reports API router - Task aging, trends, and analytics reports."""
from typing import List, Optional
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, case
from pydantic import BaseModel
from io import BytesIO, StringIO
import json, csv
from app.database import get_db
from app.models import User, Task, Project, Team, TaskStatus
from app.utils import get_current_active_user

try:
    import openpyxl
    _has_openpyxl = True
except ImportError:
    _has_openpyxl = False

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    _has_reportlab = True
except ImportError:
    _has_reportlab = False

router = APIRouter()


# Schemas
class TaskAgingItem(BaseModel):
    id: str
    name: str
    status: str
    priority: str
    age_days: int
    created_at: datetime
    due_date: Optional[datetime] = None
    overdue_days: int = 0
    assignee_name: Optional[str] = None
    project_name: Optional[str] = None


class TaskAgingReport(BaseModel):
    total_tasks: int
    avg_age_days: float
    overdue_count: int
    by_age_bracket: dict  # {"0-7": 5, "8-14": 3, ...}
    by_priority: dict
    items: List[TaskAgingItem]


class CompletionTrendItem(BaseModel):
    date: str
    created: int
    completed: int
    net_change: int
    cumulative_open: int


class CompletionTrendReport(BaseModel):
    period: str
    items: List[CompletionTrendItem]
    total_created: int
    total_completed: int
    completion_rate: float


class TeamVelocityItem(BaseModel):
    team_id: str
    team_name: str
    tasks_completed: int
    story_points: int
    avg_cycle_time_days: float
    throughput_per_week: float


class TeamVelocityReport(BaseModel):
    period_start: date
    period_end: date
    teams: List[TeamVelocityItem]


@router.get("/task-aging", response_model=TaskAgingReport)
def get_task_aging_report(
    project_id: Optional[str] = None,
    min_age_days: int = 0,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get task aging report showing stale/old tasks."""
    now = datetime.utcnow()
    
    query = db.query(Task).options(
        joinedload(Task.assignee),
        joinedload(Task.project)
    ).filter(Task.status != "done")
    
    if project_id:
        query = query.filter(Task.project_id == project_id)
    
    if status:
        query = query.filter(Task.status == status)
    
    tasks = query.all()
    
    items = []
    by_age = {"0-7": 0, "8-14": 0, "15-30": 0, "31-60": 0, "60+": 0}
    by_priority = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    total_age = 0
    overdue_count = 0
    
    for task in tasks:
        age_days = (now - task.created_at).days
        if age_days < min_age_days:
            continue
        
        overdue_days = 0
        if task.due_date and task.due_date < now:
            overdue_days = (now - task.due_date).days
            overdue_count += 1
        
        # Categorize by age
        if age_days <= 7:
            by_age["0-7"] += 1
        elif age_days <= 14:
            by_age["8-14"] += 1
        elif age_days <= 30:
            by_age["15-30"] += 1
        elif age_days <= 60:
            by_age["31-60"] += 1
        else:
            by_age["60+"] += 1
        
        # By priority
        if task.priority in by_priority:
            by_priority[task.priority] += 1
        
        total_age += age_days
        
        items.append(TaskAgingItem(
            id=str(task.id),
            name=task.name,
            status=task.status,
            priority=task.priority,
            age_days=age_days,
            created_at=task.created_at,
            due_date=task.due_date,
            overdue_days=overdue_days,
            assignee_name=task.assignee.full_name if task.assignee else None,
            project_name=task.project.name if task.project else None
        ))
    
    # Sort by age descending
    items.sort(key=lambda x: x.age_days, reverse=True)
    
    return TaskAgingReport(
        total_tasks=len(items),
        avg_age_days=round(total_age / len(items), 1) if items else 0,
        overdue_count=overdue_count,
        by_age_bracket=by_age,
        by_priority=by_priority,
        items=items[:100]  # Limit to top 100
    )


@router.get("/completion-trends", response_model=CompletionTrendReport)
def get_completion_trends(
    period: str = Query("30d", description="Period: 7d, 30d, 90d, 1y"),
    project_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get task creation vs completion trends."""
    now = datetime.utcnow()
    
    period_days = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}.get(period, 30)
    start_date = now - timedelta(days=period_days)
    
    # Get all tasks in period
    query = db.query(Task)
    if project_id:
        query = query.filter(Task.project_id == project_id)
    
    tasks = query.filter(
        Task.created_at >= start_date
    ).all()
    
    # Group by date
    daily_data = {}
    for i in range(period_days + 1):
        day = (start_date + timedelta(days=i)).date()
        daily_data[str(day)] = {"created": 0, "completed": 0}
    
    for task in tasks:
        created_date = str(task.created_at.date())
        if created_date in daily_data:
            daily_data[created_date]["created"] += 1
        
        if task.completed_at:
            completed_date = str(task.completed_at.date())
            if completed_date in daily_data:
                daily_data[completed_date]["completed"] += 1
    
    # Build trend items
    items = []
    cumulative = 0
    total_created = 0
    total_completed = 0
    
    for date_str in sorted(daily_data.keys()):
        data = daily_data[date_str]
        net = data["created"] - data["completed"]
        cumulative += net
        total_created += data["created"]
        total_completed += data["completed"]
        
        items.append(CompletionTrendItem(
            date=date_str,
            created=data["created"],
            completed=data["completed"],
            net_change=net,
            cumulative_open=cumulative
        ))
    
    completion_rate = (total_completed / total_created * 100) if total_created > 0 else 0
    
    return CompletionTrendReport(
        period=period,
        items=items,
        total_created=total_created,
        total_completed=total_completed,
        completion_rate=round(completion_rate, 1)
    )


@router.get("/team-velocity", response_model=TeamVelocityReport)
def get_team_velocity(
    weeks: int = Query(4, description="Number of weeks to analyze"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get team velocity report with throughput and cycle time."""
    now = datetime.utcnow()
    start_date = now - timedelta(weeks=weeks)
    
    teams = db.query(Team).all()
    
    team_items = []
    for team in teams:
        # Get completed tasks for this team's members
        # (assuming task.assignee is a team member)
        completed_tasks = db.query(Task).filter(
            Task.status == "done",
            Task.completed_at >= start_date,
            Task.completed_at <= now
        ).all()
        
        # Filter by team members (simplified - would need team membership)
        tasks_count = len(completed_tasks)
        
        # Calculate average cycle time
        total_cycle_time = 0
        for task in completed_tasks:
            if task.completed_at and task.created_at:
                cycle_time = (task.completed_at - task.created_at).days
                total_cycle_time += cycle_time
        
        avg_cycle_time = (total_cycle_time / tasks_count) if tasks_count > 0 else 0
        throughput = tasks_count / weeks if weeks > 0 else 0
        
        team_items.append(TeamVelocityItem(
            team_id=str(team.id),
            team_name=team.name,
            tasks_completed=tasks_count,
            story_points=0,  # Would need story points field
            avg_cycle_time_days=round(avg_cycle_time, 1),
            throughput_per_week=round(throughput, 1)
        ))
    
    return TeamVelocityReport(
        period_start=start_date.date(),
        period_end=now.date(),
        teams=team_items
    )


@router.get("/export/{report_type}")
def export_report(
    report_type: str,
    format: str = Query("json", description="Export format: json, csv"),
    project_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Export a report in JSON or CSV format."""
    if report_type == "task-aging":
        data = get_task_aging_report(project_id=project_id, db=db, current_user=current_user)
    elif report_type == "completion-trends":
        data = get_completion_trends(project_id=project_id, db=db, current_user=current_user)
    else:
        raise HTTPException(status_code=400, detail="Unknown report type")
    
    if format == "csv":
        import csv
        output = BytesIO()
        
        if report_type == "task-aging":
            # Write CSV
            csv_content = "id,name,status,priority,age_days,overdue_days,assignee,project\n"
            for item in data.items:
                csv_content += f"{item.id},{item.name},{item.status},{item.priority},{item.age_days},{item.overdue_days},{item.assignee_name or ''},{item.project_name or ''}\n"
            output.write(csv_content.encode())
        
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={report_type}.csv"}
        )
    
    return data


# ==================== Project Variance Reports ====================

@router.get("/project/{project_id}/variance")
async def get_project_variance_report(
    project_id: str,
    include_tasks: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get project variance report comparing planned vs actual.
    Includes hours, budget, and timeline variance analysis.
    """
    from app.services.report_service import ReportService
    
    service = ReportService(db)
    result = service.get_project_variance_report(project_id, include_tasks=include_tasks)
    
    if 'error' in result:
        raise HTTPException(status_code=404, detail=result['error'])
    
    return result


@router.get("/team/{team_id}/performance")
async def get_team_performance_report(
    team_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get team performance report.
    Shows task completion, hours logged, and member statistics.
    """
    from app.services.report_service import ReportService
    
    service = ReportService(db)
    result = service.get_team_performance_report(
        team_id,
        start_date=start_date,
        end_date=end_date
    )
    
    if 'error' in result:
        raise HTTPException(status_code=404, detail=result['error'])
    
    return result


# ==================== Scheduled Reports ====================

class ScheduleReportRequest(BaseModel):
    report_type: str  # project_variance, team_performance, etc.
    frequency: str  # daily, weekly, monthly
    params: Optional[dict] = None
    day_of_week: Optional[int] = None
    day_of_month: Optional[int] = None
    hour: int = 9
    minute: int = 0


@router.post("/schedule")
async def schedule_report(
    request: ScheduleReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Schedule a recurring report."""
    from app.services.scheduler_service import scheduler_service
    import uuid
    
    report_id = str(uuid.uuid4())
    
    result = scheduler_service.schedule_report(
        report_id=report_id,
        report_type=request.report_type,
        user_id=str(current_user.id),
        frequency=request.frequency,
        day_of_week=request.day_of_week,
        day_of_month=request.day_of_month,
        hour=request.hour,
        minute=request.minute
    )
    
    if result:
        return {
            "success": True,
            "report_id": report_id,
            "message": f"Report scheduled to run {request.frequency}"
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to schedule report")


@router.get("/scheduled")
async def list_scheduled_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List scheduled reports for current user."""
    from app.services.scheduler_service import scheduler_service
    
    jobs = scheduler_service.list_jobs()
    
    # Filter to only show report jobs for this user
    user_reports = [
        job for job in jobs
        if job['id'].startswith('report_') and str(current_user.id) in str(job.get('args', []))
    ]
    
    return {"reports": user_reports}


@router.delete("/scheduled/{report_id}")
async def cancel_scheduled_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Cancel a scheduled report."""
    from app.services.scheduler_service import scheduler_service
    
    job_id = f"report_{report_id}"
    result = scheduler_service.remove_job(job_id)
    
    if result:
        return {"success": True, "message": "Report cancelled"}
    else:
        raise HTTPException(status_code=404, detail="Report not found")


# ─── Report Export (CSV / Excel) ──────────────────────────────────────────────

@router.get("/export/{report_type}")
def export_report(
    report_type: str,
    format: str = Query("csv", enum=["csv", "xlsx"]),
    project_id: Optional[str] = None,
    team_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Export a report as CSV or Excel file."""
    # Build rows based on report type
    rows = []
    headers = []

    if report_type == "task-aging":
        headers = ["ID", "Title", "Status", "Priority", "Age (days)", "Due Date", "Assignee", "Project"]
        query = db.query(Task).filter(Task.is_deleted == False if hasattr(Task, "is_deleted") else True)
        if project_id:
            query = query.filter(Task.project_id == project_id)
        tasks = query.all()
        now = datetime.utcnow()
        for t in tasks:
            age = (now - t.created_at).days if t.created_at else 0
            assignee = db.query(User).filter(User.id == t.assignee_id).first() if t.assignee_id else None
            project = db.query(Project).filter(Project.id == t.project_id).first() if t.project_id else None
            rows.append([
                t.id, t.name or t.title if hasattr(t, "title") else t.name,
                t.status, t.priority, age,
                str(t.due_date) if t.due_date else "",
                assignee.full_name if assignee else "",
                project.name if project else "",
            ])

    elif report_type == "task-completion":
        headers = ["Date", "Created", "Completed", "Net Change"]
        today = datetime.utcnow().date()
        for i in range(30):
            from datetime import timedelta
            d = today - timedelta(days=29 - i)
            created = db.query(Task).filter(func.date(Task.created_at) == d).count()
            completed = db.query(Task).filter(
                func.date(Task.completed_at) == d
            ).count() if hasattr(Task, "completed_at") else 0
            rows.append([str(d), created, completed, completed - created])

    elif report_type == "workload":
        headers = ["User", "Active Tasks", "Completed Tasks", "Overdue Tasks"]
        users = db.query(User).filter(User.is_active == True).all()
        for u in users:
            active = db.query(Task).filter(
                Task.assignee_id == u.id,
                Task.status.notin_(["done", "cancelled"])
            ).count()
            completed = db.query(Task).filter(
                Task.assignee_id == u.id,
                Task.status == "done"
            ).count()
            overdue = db.query(Task).filter(
                Task.assignee_id == u.id,
                Task.due_date < datetime.utcnow(),
                Task.status.notin_(["done", "cancelled"])
            ).count()
            rows.append([u.full_name, active, completed, overdue])
    else:
        # Generic: all tasks
        headers = ["ID", "Title", "Status", "Priority", "Due Date"]
        tasks = db.query(Task).limit(500).all()
        for t in tasks:
            rows.append([t.id, getattr(t, "name", ""), t.status, t.priority, str(t.due_date) if t.due_date else ""])

    if format == "csv":
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(headers)
        writer.writerows(rows)
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={report_type}-report.csv"}
        )
    else:
        # Excel via openpyxl
        if not _has_openpyxl:
            raise HTTPException(status_code=501, detail="openpyxl not installed; use CSV format")
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = report_type.replace("-", "_")
        ws.append(headers)
        for row in rows:
            ws.append(row)
        buf = BytesIO()
        wb.save(buf)
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={report_type}-report.xlsx"}
        )


# ─── Analytics Summary Dashboard ─────────────────────────────────────────────

@router.get("/analytics-summary")
def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get consolidated analytics summary for the reports dashboard."""
    from datetime import timedelta
    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)

    # ── Task KPIs ──
    total_tasks = db.query(Task).count()
    completed_tasks = db.query(Task).filter(
        Task.status.in_(["completed", "done"])
    ).count()
    overdue_tasks = db.query(Task).filter(
        Task.due_date < now,
        Task.status.notin_(["completed", "done", "cancelled"])
    ).count()

    # ── Active projects ──
    active_projects = db.query(Project).filter(
        Project.status.in_(["active", "in_progress"])
    ).count() if hasattr(Project, "status") else db.query(Project).count()

    # ── Hours logged (last 30 days) ──
    from app.models import TimeEntry
    try:
        hours_result = db.query(func.sum(TimeEntry.hours)).filter(
            TimeEntry.date >= thirty_days_ago.date()
        ).scalar()
        total_hours_logged = round(float(hours_result or 0), 1)
    except Exception:
        total_hours_logged = 0.0

    # ── Completion rate ──
    completion_rate = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0

    # ── Average task age (open tasks) ──
    open_tasks = db.query(Task).filter(
        Task.status.notin_(["completed", "done", "cancelled"])
    ).all()
    avg_age = 0.0
    if open_tasks:
        total_age = sum((now - t.created_at).days for t in open_tasks if t.created_at)
        avg_age = round(total_age / len(open_tasks), 1)

    # ── Tasks by status ──
    all_tasks_q = db.query(Task.status, func.count(Task.id)).group_by(Task.status).all()
    tasks_by_status = {row[0]: row[1] for row in all_tasks_q}

    # ── Tasks by priority ──
    prio_q = db.query(Task.priority, func.count(Task.id)).group_by(Task.priority).all()
    tasks_by_priority = {row[0]: row[1] for row in prio_q}

    # ── 30-day completion trend ──
    tasks_in_period = db.query(Task).filter(Task.created_at >= thirty_days_ago).all()
    daily = {}
    for i in range(30):
        day = (thirty_days_ago + timedelta(days=i)).date()
        daily[str(day)] = {"date": str(day), "created": 0, "completed": 0}
    for t in tasks_in_period:
        d = str(t.created_at.date())
        if d in daily:
            daily[d]["created"] += 1
        if t.completed_at:
            cd = str(t.completed_at.date())
            if cd in daily:
                daily[cd]["completed"] += 1
    completion_trend = list(daily.values())

    # ── Project summary ──
    projects = db.query(Project).filter(
        Project.status.notin_(["archived", "cancelled"]) if hasattr(Project, "status") else True
    ).limit(20).all()
    project_summary = []
    for p in projects:
        task_count = db.query(Task).filter(Task.project_id == p.id).count()
        overdue_count = db.query(Task).filter(
            Task.project_id == p.id,
            Task.due_date < now,
            Task.status.notin_(["completed", "done", "cancelled"])
        ).count()
        project_summary.append({
            "id": str(p.id),
            "name": p.name,
            "status": p.status if hasattr(p, "status") else "active",
            "progress": p.progress_percentage if hasattr(p, "progress_percentage") else 0,
            "task_count": task_count,
            "overdue_count": overdue_count,
        })

    # ── Top overdue tasks ──
    overdue_items = db.query(Task).options(
        joinedload(Task.assignee),
        joinedload(Task.project)
    ).filter(
        Task.due_date < now,
        Task.status.notin_(["completed", "done", "cancelled"])
    ).order_by(Task.due_date.asc()).limit(10).all()
    top_overdue = []
    for t in overdue_items:
        top_overdue.append({
            "id": str(t.id),
            "name": t.name,
            "priority": t.priority,
            "overdue_days": (now - t.due_date).days if t.due_date else 0,
            "project_name": t.project.name if t.project else None,
            "assignee_name": t.assignee.full_name if t.assignee else None,
        })

    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "overdue_tasks": overdue_tasks,
        "active_projects": active_projects,
        "total_hours_logged": total_hours_logged,
        "avg_task_age_days": avg_age,
        "completion_rate": completion_rate,
        "tasks_by_status": tasks_by_status,
        "tasks_by_priority": tasks_by_priority,
        "completion_trend": completion_trend,
        "project_summary": project_summary,
        "top_overdue_tasks": top_overdue,
    }


@router.get("/workload-distribution")
def get_workload_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get per-user workload distribution."""
    now = datetime.utcnow()
    from app.models import TimeEntry
    from datetime import timedelta
    thirty_ago = now - timedelta(days=30)

    users = db.query(User).filter(User.is_active == True).all()
    result = []
    for u in users:
        active = db.query(Task).filter(
            Task.assignee_id == u.id,
            Task.status.notin_(["completed", "done", "cancelled"])
        ).count()
        completed = db.query(Task).filter(
            Task.assignee_id == u.id,
            Task.status.in_(["completed", "done"])
        ).count()
        overdue = db.query(Task).filter(
            Task.assignee_id == u.id,
            Task.due_date < now,
            Task.status.notin_(["completed", "done", "cancelled"])
        ).count()
        try:
            hours = db.query(func.sum(TimeEntry.hours)).filter(
                TimeEntry.user_id == u.id,
                TimeEntry.date >= thirty_ago.date()
            ).scalar() or 0
        except Exception:
            hours = 0
        if active > 0 or completed > 0:
            result.append({
                "user_id": str(u.id),
                "name": u.full_name,
                "active_tasks": active,
                "completed_tasks": completed,
                "overdue_tasks": overdue,
                "hours_logged_30d": round(float(hours), 1),
            })
    result.sort(key=lambda x: x["active_tasks"], reverse=True)
    return {"users": result[:20]}


# ─── Burn-Down / Burn-Up Charts ───────────────────────────────────────────────

@router.get("/burn-down")
def get_burn_down_chart(
    project_id: str,
    sprint_start: Optional[date] = None,
    sprint_end: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Burn-down chart: ideal remaining vs actual remaining tasks per day."""
    now = datetime.utcnow().date()
    start = sprint_start or (now - timedelta(days=14))
    end = sprint_end or (now + timedelta(days=14))
    total_tasks = db.query(Task).filter(Task.project_id == project_id).count()
    if total_tasks == 0:
        return {"project_id": project_id, "total_tasks": 0, "data": []}
    sprint_days = max((end - start).days, 1)
    data = []
    current = start
    while current <= end:
        completed_by_date = db.query(Task).filter(
            and_(
                Task.project_id == project_id,
                Task.status.in_(["completed", "cancelled"]),
                Task.completed_at <= datetime.combine(current, datetime.min.time()),
            )
        ).count()
        day_index = (current - start).days
        ideal = max(0, total_tasks - round(total_tasks * day_index / sprint_days))
        actual = total_tasks - completed_by_date
        data.append({"date": current.isoformat(), "ideal_remaining": ideal, "actual_remaining": actual})
        current += timedelta(days=1)
    return {"project_id": project_id, "total_tasks": total_tasks,
            "sprint_start": start.isoformat(), "sprint_end": end.isoformat(), "data": data}


@router.get("/burn-up")
def get_burn_up_chart(
    project_id: str,
    sprint_start: Optional[date] = None,
    sprint_end: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Burn-up chart: completed vs total scope per day."""
    now = datetime.utcnow().date()
    start = sprint_start or (now - timedelta(days=14))
    end = sprint_end or (now + timedelta(days=14))
    total_tasks = db.query(Task).filter(Task.project_id == project_id).count()
    data = []
    current = start
    while current <= end:
        completed_by_date = db.query(Task).filter(
            and_(
                Task.project_id == project_id,
                Task.status == "completed",
                Task.completed_at <= datetime.combine(current, datetime.min.time()),
            )
        ).count()
        data.append({"date": current.isoformat(), "total_scope": total_tasks, "completed": completed_by_date})
        current += timedelta(days=1)
    return {"project_id": project_id, "total_tasks": total_tasks,
            "sprint_start": start.isoformat(), "sprint_end": end.isoformat(), "data": data}


# ─── PDF Export ───────────────────────────────────────────────────────────────

@router.get("/export-pdf")
def export_report_pdf(
    report_type: str,
    project_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Export any report as PDF (requires reportlab). Falls back to CSV."""
    if not _has_reportlab:
        buf = StringIO()
        writer = csv.writer(buf)
        writer.writerow(["report_type", "project_id", "note"])
        writer.writerow([report_type, project_id or "", "Install reportlab for PDF support: pip install reportlab"])
        buf.seek(0)
        return StreamingResponse(iter([buf.read()]), media_type="text/csv",
                                 headers={"Content-Disposition": f"attachment; filename={report_type}.csv"})

    rows: list = []
    headers: list = []
    if report_type == "task_aging":
        tasks = db.query(Task).filter(
            *([] if not project_id else [Task.project_id == project_id]),
            Task.status.notin_(["completed", "cancelled"]),
        ).limit(200).all()
        headers = ["Task", "Status", "Priority", "Age (days)", "Due Date"]
        for t in tasks:
            age = (datetime.utcnow() - t.created_at).days if t.created_at else 0
            rows.append([t.name or "", str(t.status or ""), str(t.priority or ""),
                         str(age), str(t.due_date.date() if t.due_date else "")])
    else:
        headers = ["Note"]
        rows = [[f"PDF export for '{report_type}' — no template configured yet."]]

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = [
        Paragraph(f"{report_type.replace('_', ' ').title()} Report", styles["Title"]),
        Spacer(1, 12),
    ]
    table_data = [headers] + (rows if rows else [["No data"]])
    tbl = Table(table_data)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD5E1")),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(tbl)
    doc.build(elements)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf",
                             headers={"Content-Disposition": f"attachment; filename={report_type}-report.pdf"})
