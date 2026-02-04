"""Manager and Executive Dashboard API router."""
from typing import List, Optional
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, case
from pydantic import BaseModel
from app.database import get_db
from app.models import User, Task, Project, Team, TeamMember, Department
from app.utils import get_current_active_user

router = APIRouter()


# Schemas
class TeamPerformance(BaseModel):
    team_id: str
    team_name: str
    total_tasks: int
    completed_tasks: int
    completion_rate: float
    overdue_tasks: int
    avg_completion_time_days: float


class BottleneckItem(BaseModel):
    task_id: str
    task_name: str
    status: str
    blocked_days: int
    assignee_name: Optional[str] = None
    project_name: Optional[str] = None


class SLABreachItem(BaseModel):
    task_id: str
    task_name: str
    due_date: datetime
    overdue_days: int
    priority: str
    assignee_name: Optional[str] = None


class WorkloadDistribution(BaseModel):
    user_id: str
    user_name: str
    active_tasks: int
    completed_this_week: int
    capacity_percentage: float


class ManagerDashboardResponse(BaseModel):
    team_performance: List[TeamPerformance]
    bottlenecks: List[BottleneckItem]
    sla_breaches: List[SLABreachItem]
    workload_distribution: List[WorkloadDistribution]
    summary: dict


class ProjectHealth(BaseModel):
    project_id: str
    project_name: str
    status: str
    progress: float  # 0-100
    total_tasks: int
    completed_tasks: int
    overdue_tasks: int
    health_score: str  # healthy, at_risk, critical
    budget_utilization: Optional[float] = None


class DeliveryTrend(BaseModel):
    month: str
    on_time: int
    delayed: int
    cancelled: int


class ResourceUtilization(BaseModel):
    team_name: str
    utilization_percentage: float
    capacity_hours: int
    allocated_hours: int


class ExecutiveDashboardResponse(BaseModel):
    project_health: List[ProjectHealth]
    delivery_trends: List[DeliveryTrend]
    resource_utilization: List[ResourceUtilization]
    summary: dict


@router.get("/manager", response_model=ManagerDashboardResponse)
def get_manager_dashboard(
    team_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get manager dashboard with team performance and bottlenecks."""
    now = datetime.utcnow()
    week_start = now - timedelta(days=7)
    
    # Get teams (filter by team_id if provided)
    teams_query = db.query(Team)
    if team_id:
        teams_query = teams_query.filter(Team.id == team_id)
    teams = teams_query.all()
    
    team_performance = []
    for team in teams:
        # Get team members
        member_ids = [str(m.user_id) for m in db.query(TeamMember).filter(TeamMember.team_id == team.id).all()]
        
        if not member_ids:
            continue
        
        # Get tasks for team members
        total = db.query(Task).filter(Task.assignee_id.in_(member_ids)).count()
        completed = db.query(Task).filter(
            Task.assignee_id.in_(member_ids),
            Task.status == "done"
        ).count()
        overdue = db.query(Task).filter(
            Task.assignee_id.in_(member_ids),
            Task.status != "done",
            Task.due_date < now
        ).count()
        
        # Calculate avg completion time
        completed_tasks = db.query(Task).filter(
            Task.assignee_id.in_(member_ids),
            Task.status == "done",
            Task.completed_at != None
        ).all()
        
        avg_time = 0
        if completed_tasks:
            total_time = sum((t.completed_at - t.created_at).days for t in completed_tasks)
            avg_time = total_time / len(completed_tasks)
        
        team_performance.append(TeamPerformance(
            team_id=str(team.id),
            team_name=team.name,
            total_tasks=total,
            completed_tasks=completed,
            completion_rate=round(completed / total * 100, 1) if total > 0 else 0,
            overdue_tasks=overdue,
            avg_completion_time_days=round(avg_time, 1)
        ))
    
    # Get bottlenecks (tasks blocked or stuck for too long)
    blocked_tasks = db.query(Task).options(
        joinedload(Task.assignee),
        joinedload(Task.project)
    ).filter(
        Task.status.in_(["blocked", "waiting"]),
        Task.updated_at < now - timedelta(days=3)
    ).limit(10).all()
    
    bottlenecks = []
    for task in blocked_tasks:
        blocked_days = (now - task.updated_at).days
        bottlenecks.append(BottleneckItem(
            task_id=str(task.id),
            task_name=task.name,
            status=task.status,
            blocked_days=blocked_days,
            assignee_name=task.assignee.full_name if task.assignee else None,
            project_name=task.project.name if task.project else None
        ))
    
    # Get SLA breaches (overdue tasks)
    overdue_tasks = db.query(Task).options(
        joinedload(Task.assignee)
    ).filter(
        Task.status != "done",
        Task.due_date < now
    ).order_by(Task.due_date).limit(10).all()
    
    sla_breaches = []
    for task in overdue_tasks:
        sla_breaches.append(SLABreachItem(
            task_id=str(task.id),
            task_name=task.name,
            due_date=task.due_date,
            overdue_days=(now - task.due_date).days,
            priority=task.priority,
            assignee_name=task.assignee.full_name if task.assignee else None
        ))
    
    # Get workload distribution
    active_users = db.query(User).filter(User.is_active == True).limit(20).all()
    workload = []
    
    for user in active_users:
        active = db.query(Task).filter(
            Task.assignee_id == user.id,
            Task.status.notin_(["done", "cancelled"])
        ).count()
        
        completed_week = db.query(Task).filter(
            Task.assignee_id == user.id,
            Task.status == "done",
            Task.completed_at >= week_start
        ).count()
        
        # Capacity percentage (rough estimate based on 10 tasks/week capacity)
        capacity = min(active / 10 * 100, 150)
        
        workload.append(WorkloadDistribution(
            user_id=str(user.id),
            user_name=user.full_name,
            active_tasks=active,
            completed_this_week=completed_week,
            capacity_percentage=round(capacity, 1)
        ))
    
    # Sort by capacity
    workload.sort(key=lambda x: x.capacity_percentage, reverse=True)
    
    # Summary
    total_tasks = db.query(Task).filter(Task.status != "done").count()
    overdue_count = db.query(Task).filter(Task.status != "done", Task.due_date < now).count()
    blocked_count = db.query(Task).filter(Task.status == "blocked").count()
    
    return ManagerDashboardResponse(
        team_performance=team_performance,
        bottlenecks=bottlenecks,
        sla_breaches=sla_breaches,
        workload_distribution=workload[:10],
        summary={
            "total_active_tasks": total_tasks,
            "overdue_tasks": overdue_count,
            "blocked_tasks": blocked_count,
            "teams_count": len(teams)
        }
    )


@router.get("/executive", response_model=ExecutiveDashboardResponse)
def get_executive_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get executive dashboard with portfolio overview."""
    now = datetime.utcnow()
    
    # Get all active projects
    projects = db.query(Project).filter(
        Project.status.in_(["active", "on_hold"])
    ).all()
    
    project_health = []
    for project in projects:
        # Get task counts
        total = db.query(Task).filter(Task.project_id == project.id).count()
        completed = db.query(Task).filter(
            Task.project_id == project.id,
            Task.status == "done"
        ).count()
        overdue = db.query(Task).filter(
            Task.project_id == project.id,
            Task.status != "done",
            Task.due_date < now
        ).count()
        
        progress = (completed / total * 100) if total > 0 else 0
        
        # Determine health score
        if overdue == 0 and progress >= 50:
            health = "healthy"
        elif overdue <= 2 or progress >= 25:
            health = "at_risk"
        else:
            health = "critical"
        
        project_health.append(ProjectHealth(
            project_id=str(project.id),
            project_name=project.name,
            status=project.status,
            progress=round(progress, 1),
            total_tasks=total,
            completed_tasks=completed,
            overdue_tasks=overdue,
            health_score=health,
            budget_utilization=None  # Would need budget tracking
        ))
    
    # Sort by health (critical first)
    health_order = {"critical": 0, "at_risk": 1, "healthy": 2}
    project_health.sort(key=lambda x: health_order.get(x.health_score, 3))
    
    # Delivery trends (last 6 months)
    delivery_trends = []
    for i in range(5, -1, -1):
        month_start = (now - timedelta(days=30 * i)).replace(day=1)
        month_end = (month_start + timedelta(days=32)).replace(day=1)
        
        on_time = db.query(Task).filter(
            Task.status == "done",
            Task.completed_at >= month_start,
            Task.completed_at < month_end,
            Task.completed_at <= Task.due_date
        ).count()
        
        delayed = db.query(Task).filter(
            Task.status == "done",
            Task.completed_at >= month_start,
            Task.completed_at < month_end,
            Task.completed_at > Task.due_date
        ).count()
        
        cancelled = db.query(Task).filter(
            Task.status == "cancelled",
            Task.updated_at >= month_start,
            Task.updated_at < month_end
        ).count()
        
        delivery_trends.append(DeliveryTrend(
            month=month_start.strftime("%Y-%m"),
            on_time=on_time,
            delayed=delayed,
            cancelled=cancelled
        ))
    
    # Resource utilization by team
    teams = db.query(Team).all()
    resource_util = []
    
    for team in teams:
        capacity = team.capacity_hours_week or 40
        
        # Count active tasks (rough estimate: 4 hours per task)
        member_ids = [str(m.user_id) for m in db.query(TeamMember).filter(TeamMember.team_id == team.id).all()]
        active_tasks = db.query(Task).filter(
            Task.assignee_id.in_(member_ids),
            Task.status.notin_(["done", "cancelled"])
        ).count() if member_ids else 0
        
        allocated = active_tasks * 4
        utilization = min((allocated / capacity * 100), 150) if capacity > 0 else 0
        
        resource_util.append(ResourceUtilization(
            team_name=team.name,
            utilization_percentage=round(utilization, 1),
            capacity_hours=capacity,
            allocated_hours=allocated
        ))
    
    # Summary
    healthy = len([p for p in project_health if p.health_score == "healthy"])
    at_risk = len([p for p in project_health if p.health_score == "at_risk"])
    critical = len([p for p in project_health if p.health_score == "critical"])
    
    return ExecutiveDashboardResponse(
        project_health=project_health,
        delivery_trends=delivery_trends,
        resource_utilization=resource_util,
        summary={
            "total_projects": len(projects),
            "healthy_projects": healthy,
            "at_risk_projects": at_risk,
            "critical_projects": critical,
            "avg_completion": round(sum(p.progress for p in project_health) / len(project_health), 1) if project_health else 0
        }
    )
