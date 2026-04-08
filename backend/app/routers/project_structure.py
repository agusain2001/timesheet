"""
Project Structure API Router.
Handles Phases, Epics, and Milestones for projects — backed by the DB.
"""
from typing import List, Optional
from datetime import datetime
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.utils import get_current_active_user
from app.models import User, Project, ProjectPhase, Epic, Milestone

router = APIRouter(prefix="/project-structure", tags=["Project Structure"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class PhaseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    order: int = 0


class PhaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    order: Optional[int] = None
    status: Optional[str] = None


class EpicCreate(BaseModel):
    name: str
    description: Optional[str] = None
    phase_id: Optional[str] = None
    priority: str = "medium"
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class EpicUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    phase_id: Optional[str] = None
    priority: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = None


class MilestoneCreate(BaseModel):
    name: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    phase_id: Optional[str] = None
    is_critical: bool = False


class MilestoneUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    phase_id: Optional[str] = None
    is_critical: Optional[bool] = None
    is_completed: Optional[bool] = None


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _phase_to_dict(phase: ProjectPhase) -> dict:
    return {
        "id": phase.id,
        "project_id": phase.project_id,
        "name": phase.name,
        "description": phase.description,
        "start_date": str(phase.start_date) if phase.start_date else None,
        "end_date": str(phase.end_date) if phase.end_date else None,
        "order": phase.order if hasattr(phase, "order") else 0,
        "status": phase.status if hasattr(phase, "status") else "planning",
        "created_at": phase.created_at.isoformat() if phase.created_at else None,
    }


def _epic_to_dict(epic: Epic) -> dict:
    return {
        "id": epic.id,
        "project_id": epic.project_id,
        "phase_id": epic.phase_id,
        "name": epic.name,
        "description": epic.description,
        "priority": epic.priority if hasattr(epic, "priority") else "medium",
        "start_date": str(epic.start_date) if epic.start_date else None,
        "end_date": str(epic.end_date) if epic.end_date else None,
        "status": epic.status if hasattr(epic, "status") else "open",
        "created_at": epic.created_at.isoformat() if epic.created_at else None,
    }


def _milestone_to_dict(ms: Milestone) -> dict:
    return {
        "id": ms.id,
        "project_id": ms.project_id,
        "phase_id": ms.phase_id,
        "name": ms.name,
        "description": ms.description,
        "due_date": str(ms.due_date) if ms.due_date else None,
        "is_critical": ms.is_critical,
        "is_completed": ms.is_completed,
        "created_at": ms.created_at.isoformat() if ms.created_at else None,
    }


# ─── Phase Endpoints ──────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/phases")
def list_phases(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all phases for a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    phases = db.query(ProjectPhase).filter(ProjectPhase.project_id == project_id).all()
    return [_phase_to_dict(p) for p in phases]


@router.post("/projects/{project_id}/phases", status_code=201)
def create_phase(
    project_id: str,
    data: PhaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new project phase."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    phase = ProjectPhase(
        id=str(uuid.uuid4()),
        project_id=project_id,
        name=data.name,
        description=data.description,
        start_date=data.start_date,
        end_date=data.end_date,
        created_by=current_user.id,
    )
    # Set optional fields if they exist on the model
    if hasattr(ProjectPhase, "order"):
        phase.order = data.order
    if hasattr(ProjectPhase, "status"):
        phase.status = "planning"

    db.add(phase)
    db.commit()
    db.refresh(phase)
    return _phase_to_dict(phase)


@router.put("/projects/{project_id}/phases/{phase_id}")
def update_phase(
    project_id: str,
    phase_id: str,
    data: PhaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a project phase."""
    phase = db.query(ProjectPhase).filter(
        ProjectPhase.id == phase_id,
        ProjectPhase.project_id == project_id
    ).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(phase, field):
            setattr(phase, field, value)

    db.commit()
    db.refresh(phase)
    return _phase_to_dict(phase)


@router.delete("/projects/{project_id}/phases/{phase_id}", status_code=204)
def delete_phase(
    project_id: str,
    phase_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a project phase."""
    phase = db.query(ProjectPhase).filter(
        ProjectPhase.id == phase_id,
        ProjectPhase.project_id == project_id
    ).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    db.delete(phase)
    db.commit()
    return None


# ─── Epic Endpoints ───────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/epics")
def list_epics(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all epics for a project."""
    epics = db.query(Epic).filter(Epic.project_id == project_id).all()
    return [_epic_to_dict(e) for e in epics]


@router.post("/projects/{project_id}/epics", status_code=201)
def create_epic(
    project_id: str,
    data: EpicCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new epic."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    epic = Epic(
        id=str(uuid.uuid4()),
        project_id=project_id,
        name=data.name,
        description=data.description,
        phase_id=data.phase_id,
        start_date=data.start_date,
        end_date=data.end_date,
        created_by=current_user.id,
    )
    if hasattr(Epic, "priority"):
        epic.priority = data.priority
    if hasattr(Epic, "status"):
        epic.status = "open"

    db.add(epic)
    db.commit()
    db.refresh(epic)
    return _epic_to_dict(epic)


@router.put("/projects/{project_id}/epics/{epic_id}")
def update_epic(
    project_id: str,
    epic_id: str,
    data: EpicUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an epic."""
    epic = db.query(Epic).filter(
        Epic.id == epic_id,
        Epic.project_id == project_id
    ).first()
    if not epic:
        raise HTTPException(status_code=404, detail="Epic not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        if hasattr(epic, field):
            setattr(epic, field, value)

    db.commit()
    db.refresh(epic)
    return _epic_to_dict(epic)


@router.delete("/projects/{project_id}/epics/{epic_id}", status_code=204)
def delete_epic(
    project_id: str,
    epic_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete an epic."""
    epic = db.query(Epic).filter(
        Epic.id == epic_id,
        Epic.project_id == project_id
    ).first()
    if not epic:
        raise HTTPException(status_code=404, detail="Epic not found")
    db.delete(epic)
    db.commit()
    return None


# ─── Milestone Endpoints ──────────────────────────────────────────────────────

@router.get("/projects/{project_id}/milestones")
def list_milestones(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all milestones for a project."""
    milestones = db.query(Milestone).filter(Milestone.project_id == project_id).all()
    return [_milestone_to_dict(m) for m in milestones]


@router.post("/projects/{project_id}/milestones", status_code=201)
def create_milestone(
    project_id: str,
    data: MilestoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new milestone."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ms = Milestone(
        id=str(uuid.uuid4()),
        project_id=project_id,
        name=data.name,
        description=data.description,
        due_date=data.due_date,
        phase_id=data.phase_id,
        is_critical=data.is_critical,
        is_completed=False,
        created_by=current_user.id,
    )
    db.add(ms)
    db.commit()
    db.refresh(ms)
    return _milestone_to_dict(ms)


@router.put("/projects/{project_id}/milestones/{milestone_id}")
def update_milestone(
    project_id: str,
    milestone_id: str,
    data: MilestoneUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a milestone."""
    ms = db.query(Milestone).filter(
        Milestone.id == milestone_id,
        Milestone.project_id == project_id
    ).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Milestone not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        if hasattr(ms, field):
            setattr(ms, field, value)

    db.commit()
    db.refresh(ms)
    return _milestone_to_dict(ms)


@router.delete("/projects/{project_id}/milestones/{milestone_id}", status_code=204)
def delete_milestone(
    project_id: str,
    milestone_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a milestone."""
    ms = db.query(Milestone).filter(
        Milestone.id == milestone_id,
        Milestone.project_id == project_id
    ).first()
    if not ms:
        raise HTTPException(status_code=404, detail="Milestone not found")
    db.delete(ms)
    db.commit()
    return None


# ─── Hierarchy View ───────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/hierarchy")
def get_project_hierarchy(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get full project hierarchy: Project → Phases → Epics & Milestones."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    phases = db.query(ProjectPhase).filter(ProjectPhase.project_id == project_id).all()
    all_epics = db.query(Epic).filter(Epic.project_id == project_id).all()
    all_milestones = db.query(Milestone).filter(Milestone.project_id == project_id).all()

    hierarchy = []
    for phase in phases:
        epics = [_epic_to_dict(e) for e in all_epics if e.phase_id == phase.id]
        milestones = [_milestone_to_dict(m) for m in all_milestones if m.phase_id == phase.id]
        hierarchy.append({
            **_phase_to_dict(phase),
            "epics": epics,
            "milestones": milestones,
        })

    orphan_epics = [_epic_to_dict(e) for e in all_epics if not e.phase_id]
    orphan_milestones = [_milestone_to_dict(m) for m in all_milestones if not m.phase_id]

    return {
        "project_id": project_id,
        "project_name": project.name,
        "phases": hierarchy,
        "unphased_epics": orphan_epics,
        "unphased_milestones": orphan_milestones,
    }
