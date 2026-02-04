"""Workload and capacity management API router."""
from typing import List, Optional
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.database import get_db
from app.models import User, Task, Team, TeamMember, TimeEntry, Timesheet, Project
from app.utils import get_current_active_user

router = APIRouter()


# =============== Schemas ===============

class UserWorkloadResponse(BaseModel):
    user_id: str
    user_name: str
    capacity_hours_week: float
    allocated_hours: float
    logged_hours_week: float
    available_hours: float
    utilization_percentage: float
    active_tasks: int
    overdue_tasks: int
    tasks_due_this_week: int
    status: str  # "underutilized", "optimal", "overloaded"


class TeamCapacityResponse(BaseModel):
    team_id: str
    team_name: str
    total_members: int
    total_capacity: float
    allocated_capacity: float
    available_capacity: float
    utilization_percentage: float
    member_workloads: List[UserWorkloadResponse]


class BurndownDataPoint(BaseModel):
    date: str
    remaining_hours: float
    ideal_hours: float
    completed_hours: float


class BurndownResponse(BaseModel):
    project_id: str
    project_name: str
    start_date: str
    end_date: str
    total_estimated_hours: float
    total_completed_hours: float
    data_points: List[BurndownDataPoint]


class VelocityDataPoint(BaseModel):
    week: str
    tasks_completed: int
    hours_logged: float
    story_points: float


class VelocityResponse(BaseModel):
    team_id: str
    team_name: str
    avg_tasks_per_week: float
    avg_hours_per_week: float
    trend: str  # "increasing", "stable", "decreasing"
    data_points: List[VelocityDataPoint]


class CapacityPlanningItem(BaseModel):
    user_id: str
    user_name: str
    week_starting: str
    capacity_hours: float
    allocated_hours: float
    availability_percentage: float


class CapacityPlanningResponse(BaseModel):
    period_start: str
    period_end: str
    weeks: int
    items: List[CapacityPlanningItem]
    total_capacity: float
    total_allocated: float
    overall_utilization: float


class OverallocationAlert(BaseModel):
    user_id: str
    user_name: str
    week_starting: str
    capacity_hours: float
    allocated_hours: float
    overallocation_hours: float
    affected_tasks: List[str]


# =============== Endpoints ===============

@router.get("/user/{user_id}", response_model=UserWorkloadResponse)
def get_user_workload(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get workload analysis for a specific user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get capacity
    capacity = user.capacity_hours_week or 40.0
    
    # Get active tasks
    active_tasks = db.query(Task).filter(
        Task.assignee_id == user_id,
        Task.status.in_(["todo", "in_progress", "waiting", "blocked", "review"])
    ).all()
    
    allocated_hours = sum(t.estimated_hours or 0 for t in active_tasks)
    
    # Get overdue tasks
    today = datetime.utcnow()
    overdue = sum(1 for t in active_tasks if t.due_date and t.due_date < today)
    
    # Get tasks due this week
    week_end = today + timedelta(days=(6 - today.weekday()))
    due_this_week = sum(1 for t in active_tasks if t.due_date and t.due_date <= week_end)
    
    # Get logged hours this week
    week_start = today.date() - timedelta(days=today.weekday())
    logged_hours = db.query(func.sum(TimeEntry.hours)).join(Timesheet).filter(
        Timesheet.user_id == user_id,
        TimeEntry.day >= week_start
    ).scalar() or 0.0
    
    # Calculate utilization
    utilization = (allocated_hours / capacity * 100) if capacity > 0 else 0
    
    # Determine status
    if utilization < 50:
        status = "underutilized"
    elif utilization <= 100:
        status = "optimal"
    else:
        status = "overloaded"
    
    return UserWorkloadResponse(
        user_id=user.id,
        user_name=user.full_name,
        capacity_hours_week=capacity,
        allocated_hours=allocated_hours,
        logged_hours_week=float(logged_hours),
        available_hours=max(0, capacity - allocated_hours),
        utilization_percentage=round(utilization, 1),
        active_tasks=len(active_tasks),
        overdue_tasks=overdue,
        tasks_due_this_week=due_this_week,
        status=status
    )


@router.get("/team/{team_id}", response_model=TeamCapacityResponse)
def get_team_capacity(
    team_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get capacity analysis for a team."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Get active members
    active_members = [m for m in team.members if m.is_active]
    
    member_workloads = []
    total_capacity = 0.0
    total_allocated = 0.0
    
    for member in active_members:
        user = db.query(User).filter(User.id == member.user_id).first()
        if not user:
            continue
        
        # Calculate member capacity with allocation
        member_capacity = (member.allocation_percentage / 100) * (user.capacity_hours_week or 40.0)
        total_capacity += member_capacity
        
        # Get member's tasks
        active_tasks = db.query(Task).filter(
            Task.assignee_id == user.id,
            Task.status.in_(["todo", "in_progress", "waiting", "blocked", "review"])
        ).all()
        
        allocated = sum(t.estimated_hours or 0 for t in active_tasks)
        total_allocated += allocated
        
        today = datetime.utcnow()
        overdue = sum(1 for t in active_tasks if t.due_date and t.due_date < today)
        week_end = today + timedelta(days=(6 - today.weekday()))
        due_this_week = sum(1 for t in active_tasks if t.due_date and t.due_date <= week_end)
        
        week_start = today.date() - timedelta(days=today.weekday())
        logged = db.query(func.sum(TimeEntry.hours)).join(Timesheet).filter(
            Timesheet.user_id == user.id,
            TimeEntry.day >= week_start
        ).scalar() or 0.0
        
        utilization = (allocated / member_capacity * 100) if member_capacity > 0 else 0
        
        if utilization < 50:
            status = "underutilized"
        elif utilization <= 100:
            status = "optimal"
        else:
            status = "overloaded"
        
        member_workloads.append(UserWorkloadResponse(
            user_id=user.id,
            user_name=user.full_name,
            capacity_hours_week=member_capacity,
            allocated_hours=allocated,
            logged_hours_week=float(logged),
            available_hours=max(0, member_capacity - allocated),
            utilization_percentage=round(utilization, 1),
            active_tasks=len(active_tasks),
            overdue_tasks=overdue,
            tasks_due_this_week=due_this_week,
            status=status
        ))
    
    overall_utilization = (total_allocated / total_capacity * 100) if total_capacity > 0 else 0
    
    return TeamCapacityResponse(
        team_id=team.id,
        team_name=team.name,
        total_members=len(active_members),
        total_capacity=total_capacity,
        allocated_capacity=total_allocated,
        available_capacity=max(0, total_capacity - total_allocated),
        utilization_percentage=round(overall_utilization, 1),
        member_workloads=member_workloads
    )


@router.get("/burndown/{project_id}", response_model=BurndownResponse)
def get_burndown_chart(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get burndown chart data for a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get all tasks for the project
    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    
    # Calculate totals
    total_estimated = sum(t.estimated_hours or 0 for t in tasks)
    total_completed = sum(t.actual_hours or 0 for t in tasks if t.status == "completed")
    
    # Determine date range
    start_date = project.start_date or project.created_at.date()
    end_date = project.end_date or (datetime.utcnow().date() + timedelta(days=30))
    
    # Generate data points
    data_points = []
    total_days = (end_date - start_date).days or 1
    
    # Group completed tasks by date
    completed_by_date = {}
    for task in tasks:
        if task.status == "completed" and task.completed_at:
            task_date = task.completed_at.date()
            if task_date not in completed_by_date:
                completed_by_date[task_date] = 0
            completed_by_date[task_date] += task.actual_hours or task.estimated_hours or 0
    
    # Generate daily data points
    current_date = start_date
    cumulative_completed = 0
    while current_date <= min(end_date, datetime.utcnow().date()):
        # Ideal remaining
        days_elapsed = (current_date - start_date).days
        ideal_remaining = total_estimated * (1 - (days_elapsed / total_days))
        
        # Actual remaining
        if current_date in completed_by_date:
            cumulative_completed += completed_by_date[current_date]
        
        remaining = total_estimated - cumulative_completed
        
        data_points.append(BurndownDataPoint(
            date=current_date.isoformat(),
            remaining_hours=round(remaining, 1),
            ideal_hours=round(max(0, ideal_remaining), 1),
            completed_hours=round(cumulative_completed, 1)
        ))
        
        current_date += timedelta(days=1)
    
    return BurndownResponse(
        project_id=project.id,
        project_name=project.name,
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
        total_estimated_hours=total_estimated,
        total_completed_hours=total_completed,
        data_points=data_points
    )


@router.get("/velocity/{team_id}", response_model=VelocityResponse)
def get_team_velocity(
    team_id: str,
    weeks: int = 12,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get velocity metrics for a team over time."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    data_points = []
    today = datetime.utcnow().date()
    
    tasks_counts = []
    hours_counts = []
    
    for i in range(weeks - 1, -1, -1):
        week_start = today - timedelta(days=today.weekday() + (i * 7))
        week_end = week_start + timedelta(days=6)
        
        # Get completed tasks this week
        completed = db.query(Task).filter(
            Task.team_id == team_id,
            Task.status == "completed",
            Task.completed_at >= week_start,
            Task.completed_at <= week_end
        ).all()
        
        tasks_completed = len(completed)
        hours_logged = sum(t.actual_hours or t.estimated_hours or 0 for t in completed)
        
        tasks_counts.append(tasks_completed)
        hours_counts.append(hours_logged)
        
        data_points.append(VelocityDataPoint(
            week=week_start.isoformat(),
            tasks_completed=tasks_completed,
            hours_logged=round(hours_logged, 1),
            story_points=tasks_completed * 2  # Simplified story points
        ))
    
    # Calculate averages and trend
    avg_tasks = sum(tasks_counts) / len(tasks_counts) if tasks_counts else 0
    avg_hours = sum(hours_counts) / len(hours_counts) if hours_counts else 0
    
    # Determine trend (compare last 4 weeks to previous 4 weeks)
    if len(tasks_counts) >= 8:
        recent = sum(tasks_counts[-4:])
        previous = sum(tasks_counts[-8:-4])
        if recent > previous * 1.1:
            trend = "increasing"
        elif recent < previous * 0.9:
            trend = "decreasing"
        else:
            trend = "stable"
    else:
        trend = "stable"
    
    return VelocityResponse(
        team_id=team.id,
        team_name=team.name,
        avg_tasks_per_week=round(avg_tasks, 1),
        avg_hours_per_week=round(avg_hours, 1),
        trend=trend,
        data_points=data_points
    )


@router.get("/capacity", response_model=CapacityPlanningResponse)
def get_capacity_planning(
    weeks: int = 4,
    team_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get capacity planning data for upcoming weeks."""
    today = datetime.utcnow().date()
    week_start = today - timedelta(days=today.weekday())
    
    # Get users to plan for
    if team_id:
        team_members = db.query(TeamMember).filter(
            TeamMember.team_id == team_id,
            TeamMember.is_active == True
        ).all()
        user_ids = [m.user_id for m in team_members]
    else:
        # Default to all active users
        users = db.query(User).filter(User.is_active == True).all()
        user_ids = [u.id for u in users]
    
    items = []
    total_capacity = 0.0
    total_allocated = 0.0
    
    for i in range(weeks):
        current_week = week_start + timedelta(weeks=i)
        week_end = current_week + timedelta(days=6)
        
        for user_id in user_ids:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                continue
            
            capacity = user.capacity_hours_week or 40.0
            total_capacity += capacity
            
            # Get tasks due this week
            tasks = db.query(Task).filter(
                Task.assignee_id == user_id,
                Task.due_date >= current_week,
                Task.due_date <= week_end,
                Task.status.in_(["todo", "in_progress", "waiting", "blocked", "review"])
            ).all()
            
            allocated = sum(t.estimated_hours or 0 for t in tasks)
            total_allocated += allocated
            
            availability = ((capacity - allocated) / capacity * 100) if capacity > 0 else 0
            
            items.append(CapacityPlanningItem(
                user_id=user.id,
                user_name=user.full_name,
                week_starting=current_week.isoformat(),
                capacity_hours=capacity,
                allocated_hours=allocated,
                availability_percentage=round(max(0, availability), 1)
            ))
    
    overall_utilization = (total_allocated / total_capacity * 100) if total_capacity > 0 else 0
    
    return CapacityPlanningResponse(
        period_start=week_start.isoformat(),
        period_end=(week_start + timedelta(weeks=weeks - 1, days=6)).isoformat(),
        weeks=weeks,
        items=items,
        total_capacity=total_capacity,
        total_allocated=total_allocated,
        overall_utilization=round(overall_utilization, 1)
    )


@router.get("/alerts", response_model=List[OverallocationAlert])
def get_overallocation_alerts(
    weeks: int = 2,
    team_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get overallocation alerts for users."""
    today = datetime.utcnow().date()
    week_start = today - timedelta(days=today.weekday())
    
    alerts = []
    
    # Get users to check
    if team_id:
        team_members = db.query(TeamMember).filter(
            TeamMember.team_id == team_id,
            TeamMember.is_active == True
        ).all()
        users = [db.query(User).filter(User.id == m.user_id).first() for m in team_members]
    else:
        users = db.query(User).filter(User.is_active == True).all()
    
    for i in range(weeks):
        current_week = week_start + timedelta(weeks=i)
        week_end = current_week + timedelta(days=6)
        
        for user in users:
            if not user:
                continue
            
            capacity = user.capacity_hours_week or 40.0
            
            # Get tasks allocated for this week
            tasks = db.query(Task).filter(
                Task.assignee_id == user.id,
                Task.due_date >= current_week,
                Task.due_date <= week_end,
                Task.status.in_(["todo", "in_progress", "waiting", "blocked", "review"])
            ).all()
            
            allocated = sum(t.estimated_hours or 0 for t in tasks)
            
            if allocated > capacity:
                alerts.append(OverallocationAlert(
                    user_id=user.id,
                    user_name=user.full_name,
                    week_starting=current_week.isoformat(),
                    capacity_hours=capacity,
                    allocated_hours=allocated,
                    overallocation_hours=allocated - capacity,
                    affected_tasks=[t.name for t in tasks[:5]]  # First 5 tasks
                ))
    
    return alerts
