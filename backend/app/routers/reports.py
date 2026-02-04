"""Reports API router - Task aging, trends, and analytics reports."""
from typing import List, Optional
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, case
from pydantic import BaseModel
from io import BytesIO
import json
from app.database import get_db
from app.models import User, Task, Project, Team, TaskStatus
from app.utils import get_current_active_user

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
    
    jobs = scheduler_service.get_scheduled_jobs()
    
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
