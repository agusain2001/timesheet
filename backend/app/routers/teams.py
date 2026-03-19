"""Team management API router."""
from typing import List, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.database import get_db
from app.models import Team, TeamMember, User, Task, TimeEntry
from app.models.department import Department
from app.utils import get_current_active_user
from app.utils.role_guards import is_admin, is_manager

router = APIRouter()


# =============== Schemas ===============

class TeamMemberInput(BaseModel):
    user_id: str
    role: str = "member"
    allocation_percentage: float = 100.0
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class TeamMemberResponse(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    user_avatar: Optional[str] = None
    role: str
    allocation_percentage: float
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: bool
    
    class Config:
        from_attributes = True


class TeamBase(BaseModel):
    name: str
    description: Optional[str] = None
    parent_team_id: Optional[str] = None
    department_id: Optional[str] = None
    lead_id: Optional[str] = None
    capacity_hours_week: float = 40.0
    color: Optional[str] = None
    icon: Optional[str] = None


class TeamCreate(TeamBase):
    members: Optional[List[TeamMemberInput]] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_team_id: Optional[str] = None
    department_id: Optional[str] = None
    lead_id: Optional[str] = None
    capacity_hours_week: Optional[float] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None
    members: Optional[List[TeamMemberInput]] = None


class TeamResponse(TeamBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    members: List[TeamMemberResponse] = []
    lead_name: Optional[str] = None
    department_name: Optional[str] = None
    member_count: int = 0
    sub_teams: List["TeamResponse"] = []
    
    class Config:
        from_attributes = True


class TeamWorkloadResponse(BaseModel):
    team_id: str
    team_name: str
    total_capacity_hours: float
    allocated_hours: float
    available_hours: float
    utilization_percentage: float
    overloaded_members: List[str] = []
    underutilized_members: List[str] = []
    active_tasks_count: int
    completed_tasks_week: int


# =============== Helper Functions ===============

def _build_member_response(tm: TeamMember, user: Optional[User]) -> TeamMemberResponse:
    """Build a TeamMemberResponse from a TeamMember and optional User."""
    return TeamMemberResponse(
        id=str(tm.id),
        user_id=str(tm.user_id),
        user_name=str(user.full_name) if user else None,
        user_email=str(user.email) if user else None,
        user_avatar=str(user.avatar_url) if user and getattr(user, "avatar_url", None) else None,
        role=str(tm.role),
        allocation_percentage=float(tm.allocation_percentage or 100),
        start_date=tm.start_date,  # type: ignore[arg-type]
        end_date=tm.end_date,  # type: ignore[arg-type]
        is_active=bool(tm.is_active),
    )


def build_team_response(team: Team, db: Session, include_subtems: bool = False) -> dict:
    """Build team response with members and stats."""
    members = []
    for tm in team.members:
        user = db.query(User).filter(User.id == tm.user_id).first()
        members.append(_build_member_response(tm, user))

    lead_name = None
    if team.lead_id:  # type: ignore[truthy-bool]
        lead = db.query(User).filter(User.id == team.lead_id).first()
        lead_name = str(lead.full_name) if lead else None

    department_name = None
    if team.department_id:  # type: ignore[truthy-bool]
        dept = db.query(Department).filter(Department.id == team.department_id).first()
        department_name = str(dept.name) if dept else None
    
    sub_teams_list = []
    if include_subtems and team.sub_teams:
        for st in team.sub_teams:
            sub_teams_list.append(build_team_response(st, db, include_subtems=False))
    
    return {
        "id": team.id,
        "name": team.name,
        "description": team.description,
        "parent_team_id": team.parent_team_id,
        "department_id": team.department_id,
        "department_name": department_name,
        "lead_id": team.lead_id,
        "lead_name": lead_name,
        "capacity_hours_week": team.capacity_hours_week,
        "color": team.color,
        "icon": team.icon,
        "is_active": team.is_active,
        "created_at": team.created_at,
        "updated_at": team.updated_at,
        "members": members,
        "member_count": len([m for m in team.members if m.is_active]),
        "sub_teams": sub_teams_list
    }


# =============== Endpoints ===============

@router.get("/", response_model=List[TeamResponse])
def get_all_teams(
    skip: int = 0,
    limit: int = 100,
    department_id: Optional[str] = None,
    parent_team_id: Optional[str] = None,
    include_inactive: bool = False,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all teams with optional filters."""
    query = db.query(Team)
    
    if not include_inactive:
        query = query.filter(Team.is_active == True)
    if department_id:
        query = query.filter(Team.department_id == department_id)
    if parent_team_id:
        query = query.filter(Team.parent_team_id == parent_team_id)
    elif parent_team_id == "":
        query = query.filter(Team.parent_team_id == None)  # Top-level teams only
    if search:
        query = query.filter(Team.name.ilike(f"%{search}%"))
    
    teams = query.offset(skip).limit(limit).all()
    return [build_team_response(t, db, include_subtems=True) for t in teams]


@router.post("/", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
def create_team(
    team_data: TeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new team. Requires manager+ role."""
    if not is_manager(current_user):
        raise HTTPException(status_code=403, detail="Manager or admin access required")
    db_team = Team(
        name=team_data.name,
        description=team_data.description,
        # Convert empty strings to None for optional FK fields
        parent_team_id=team_data.parent_team_id or None,
        department_id=team_data.department_id or None,
        lead_id=team_data.lead_id or None,
        capacity_hours_week=team_data.capacity_hours_week,
        color=team_data.color,
        icon=team_data.icon
    )
    # Stamp organization
    if hasattr(current_user, 'organization_id') and current_user.organization_id:  # type: ignore[truthy-bool]
        db_team.organization_id = current_user.organization_id  # type: ignore[assignment]
    db.add(db_team)
    db.flush()
    
    # Add members if provided
    if team_data.members:
        for member in team_data.members:
            user = db.query(User).filter(User.id == member.user_id).first()
            if not user:
                continue
            
            team_member = TeamMember(
                team_id=db_team.id,
                user_id=member.user_id,
                role=member.role,
                allocation_percentage=member.allocation_percentage,
                start_date=member.start_date or date.today(),
                end_date=member.end_date
            )
            db.add(team_member)
    
    db.commit()
    db.refresh(db_team)
    return build_team_response(db_team, db)


@router.get("/{team_id}", response_model=TeamResponse)
def get_team(
    team_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific team by ID."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return build_team_response(team, db, include_subtems=True)


@router.put("/{team_id}", response_model=TeamResponse)
def update_team(
    team_id: str,
    team_data: TeamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a team. Requires manager+ role."""
    if not is_manager(current_user):
        raise HTTPException(status_code=403, detail="Manager or admin access required")
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Update basic fields
    if team_data.name is not None:
        team.name = team_data.name
    if team_data.description is not None:
        team.description = team_data.description
    if team_data.parent_team_id is not None:
        team.parent_team_id = team_data.parent_team_id
    if team_data.department_id is not None:
        team.department_id = team_data.department_id
    if team_data.lead_id is not None:
        team.lead_id = team_data.lead_id
    if team_data.capacity_hours_week is not None:
        team.capacity_hours_week = team_data.capacity_hours_week
    if team_data.color is not None:
        team.color = team_data.color
    if team_data.icon is not None:
        team.icon = team_data.icon
    if team_data.is_active is not None:
        team.is_active = team_data.is_active
    
    # Update members if provided
    if team_data.members is not None:
        # Deactivate existing members
        db.query(TeamMember).filter(TeamMember.team_id == team_id).update({"is_active": False})
        
        # Add/update members
        for member in team_data.members:
            existing = db.query(TeamMember).filter(
                TeamMember.team_id == team_id,
                TeamMember.user_id == member.user_id
            ).first()
            
            if existing:
                existing.role = member.role
                existing.allocation_percentage = member.allocation_percentage
                existing.start_date = member.start_date or existing.start_date
                existing.end_date = member.end_date
                existing.is_active = True
            else:
                team_member = TeamMember(
                    team_id=team_id,
                    user_id=member.user_id,
                    role=member.role,
                    allocation_percentage=member.allocation_percentage,
                    start_date=member.start_date or date.today(),
                    end_date=member.end_date
                )
                db.add(team_member)
    
    db.commit()
    db.refresh(team)
    return build_team_response(team, db)


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team(
    team_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a team (soft delete by deactivating). Requires admin role."""
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    team.is_active = False
    db.commit()
    return None


@router.get("/{team_id}/members", response_model=List[TeamMemberResponse])
def get_team_members(
    team_id: str,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all members of a team."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    members = []
    for tm in team.members:
        if not include_inactive and not tm.is_active:
            continue
        user = db.query(User).filter(User.id == tm.user_id).first()
        members.append(_build_member_response(tm, user))

    return members


@router.post("/{team_id}/members", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED)
def add_team_member(
    team_id: str,
    member_data: TeamMemberInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add a member to a team. Requires manager+ role."""
    if not is_manager(current_user):
        raise HTTPException(status_code=403, detail="Manager or admin access required")
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    user = db.query(User).filter(User.id == member_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already a member
    existing = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == member_data.user_id
    ).first()
    
    if existing:
        if bool(existing.is_active):
            raise HTTPException(status_code=400, detail="User is already a team member")
        # Reactivate
        existing.is_active = True  # type: ignore[assignment]
        existing.role = member_data.role  # type: ignore[assignment]
        existing.allocation_percentage = member_data.allocation_percentage  # type: ignore[assignment]
        db.commit()
        db.refresh(existing)
        return _build_member_response(existing, user)

    team_member = TeamMember(
        team_id=team_id,
        user_id=member_data.user_id,
        role=member_data.role,
        allocation_percentage=member_data.allocation_percentage,
        start_date=member_data.start_date or date.today(),
        end_date=member_data.end_date
    )
    db.add(team_member)
    db.commit()
    db.refresh(team_member)

    return _build_member_response(team_member, user)


@router.delete("/{team_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_team_member(
    team_id: str,
    member_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Remove a member from a team. Requires manager+ role."""
    if not is_manager(current_user):
        raise HTTPException(status_code=403, detail="Manager or admin access required")
    member = db.query(TeamMember).filter(
        TeamMember.id == member_id,
        TeamMember.team_id == team_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    member.is_active = False  # type: ignore[assignment]
    member.end_date = date.today()  # type: ignore[assignment]
    db.commit()
    return None


@router.get("/{team_id}/workload", response_model=TeamWorkloadResponse)
def get_team_workload(
    team_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get team workload and capacity analysis."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Get active members
    active_members = [m for m in team.members if m.is_active]
    
    # Calculate total capacity (cast to float for pyright compatibility)
    total_capacity = float(sum(
        float(m.allocation_percentage or 100) / 100 * float(team.capacity_hours_week or 40)
        for m in active_members
    ))

    # Get active tasks for the team
    active_tasks = db.query(Task).filter(
        Task.team_id == team_id,
        Task.status.in_(["todo", "in_progress", "waiting", "blocked", "review"])
    ).all()

    # Calculate allocated hours
    allocated_hours = float(sum(float(t.estimated_hours or 0) for t in active_tasks))

    # Get completed tasks this week
    from datetime import timedelta
    week_start = datetime.utcnow().date() - timedelta(days=datetime.utcnow().weekday())
    completed_this_week = db.query(Task).filter(
        Task.team_id == team_id,
        Task.status == "completed",
        Task.completed_at >= week_start
    ).count()

    # Calculate utilization
    utilization = (allocated_hours / total_capacity * 100) if total_capacity > 0 else 0.0

    # Find overloaded and underutilized members
    overloaded = []
    underutilized = []

    for member in active_members:
        member_capacity = float(member.allocation_percentage or 100) / 100 * float(team.capacity_hours_week or 40)
        member_tasks = db.query(Task).filter(
            Task.assignee_id == member.user_id,
            Task.status.in_(["todo", "in_progress"])
        ).all()
        member_hours = float(sum(float(t.estimated_hours or 0) for t in member_tasks))

        user = db.query(User).filter(User.id == member.user_id).first()
        if user:
            if member_hours > member_capacity * 1.1:  # >110% capacity
                overloaded.append(str(user.full_name))
            elif member_hours < member_capacity * 0.5:  # <50% capacity
                underutilized.append(str(user.full_name))

    return TeamWorkloadResponse(
        team_id=str(team.id),
        team_name=str(team.name),
        total_capacity_hours=total_capacity,
        allocated_hours=allocated_hours,
        available_hours=max(0.0, total_capacity - allocated_hours),
        utilization_percentage=round(utilization, 1),
        overloaded_members=overloaded,
        underutilized_members=underutilized,
        active_tasks_count=len(active_tasks),
        completed_tasks_week=completed_this_week
    )
