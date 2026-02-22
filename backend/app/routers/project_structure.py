"""
Project Structure API Router.
Handles Phases, Epics, and Milestones for projects.
"""
from typing import List, Optional
from datetime import datetime
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.utils import get_current_active_user
from app.models import User, Project

router = APIRouter(prefix="/project-structure", tags=["Project Structure"])

# ─── In-memory stores (replace with DB tables in production) ─────────────────

_phases: dict = {}
_epics: dict = {}
_milestones: dict = {}


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
    phases = [p for p in _phases.values() if p["project_id"] == project_id]
    phases.sort(key=lambda p: p.get("order", 0))
    return phases


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
    phase_id = str(uuid.uuid4())
    phase = {
        "id": phase_id,
        "project_id": project_id,
        "name": data.name,
        "description": data.description,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "order": data.order,
        "status": "planning",
        "created_by": str(current_user.id),
        "created_at": datetime.utcnow().isoformat(),
    }
    _phases[phase_id] = phase
    return phase


@router.put("/projects/{project_id}/phases/{phase_id}")
def update_phase(
    project_id: str,
    phase_id: str,
    data: PhaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a project phase."""
    phase = _phases.get(phase_id)
    if not phase or phase["project_id"] != project_id:
        raise HTTPException(status_code=404, detail="Phase not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        phase[field] = value
    return phase


@router.delete("/projects/{project_id}/phases/{phase_id}", status_code=204)
def delete_phase(
    project_id: str,
    phase_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a project phase."""
    phase = _phases.get(phase_id)
    if not phase or phase["project_id"] != project_id:
        raise HTTPException(status_code=404, detail="Phase not found")
    del _phases[phase_id]
    return None


# ─── Epic Endpoints ───────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/epics")
def list_epics(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all epics for a project."""
    epics = [e for e in _epics.values() if e["project_id"] == project_id]
    return epics


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
    epic_id = str(uuid.uuid4())
    epic = {
        "id": epic_id,
        "project_id": project_id,
        "phase_id": data.phase_id,
        "name": data.name,
        "description": data.description,
        "priority": data.priority,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "status": "open",
        "task_count": 0,
        "completed_count": 0,
        "created_by": str(current_user.id),
        "created_at": datetime.utcnow().isoformat(),
    }
    _epics[epic_id] = epic
    return epic


@router.put("/projects/{project_id}/epics/{epic_id}")
def update_epic(
    project_id: str,
    epic_id: str,
    data: EpicUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an epic."""
    epic = _epics.get(epic_id)
    if not epic or epic["project_id"] != project_id:
        raise HTTPException(status_code=404, detail="Epic not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        epic[field] = value
    return epic


@router.delete("/projects/{project_id}/epics/{epic_id}", status_code=204)
def delete_epic(
    project_id: str,
    epic_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete an epic."""
    epic = _epics.get(epic_id)
    if not epic or epic["project_id"] != project_id:
        raise HTTPException(status_code=404, detail="Epic not found")
    del _epics[epic_id]
    return None


# ─── Milestone Endpoints ──────────────────────────────────────────────────────

@router.get("/projects/{project_id}/milestones")
def list_milestones(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all milestones for a project."""
    milestones = [m for m in _milestones.values() if m["project_id"] == project_id]
    milestones.sort(key=lambda m: m.get("due_date") or "")
    return milestones


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
    ms_id = str(uuid.uuid4())
    milestone = {
        "id": ms_id,
        "project_id": project_id,
        "phase_id": data.phase_id,
        "name": data.name,
        "description": data.description,
        "due_date": data.due_date,
        "is_critical": data.is_critical,
        "is_completed": False,
        "created_by": str(current_user.id),
        "created_at": datetime.utcnow().isoformat(),
    }
    _milestones[ms_id] = milestone
    return milestone


@router.put("/projects/{project_id}/milestones/{milestone_id}")
def update_milestone(
    project_id: str,
    milestone_id: str,
    data: MilestoneUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a milestone."""
    milestone = _milestones.get(milestone_id)
    if not milestone or milestone["project_id"] != project_id:
        raise HTTPException(status_code=404, detail="Milestone not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        milestone[field] = value
    return milestone


@router.delete("/projects/{project_id}/milestones/{milestone_id}", status_code=204)
def delete_milestone(
    project_id: str,
    milestone_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a milestone."""
    milestone = _milestones.get(milestone_id)
    if not milestone or milestone["project_id"] != project_id:
        raise HTTPException(status_code=404, detail="Milestone not found")
    del _milestones[milestone_id]
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

    phases = [p for p in _phases.values() if p["project_id"] == project_id]
    phases.sort(key=lambda p: p.get("order", 0))

    hierarchy = []
    for phase in phases:
        epics = [e for e in _epics.values() if e.get("phase_id") == phase["id"]]
        milestones = [m for m in _milestones.values() if m.get("phase_id") == phase["id"]]
        hierarchy.append({
            **phase,
            "epics": epics,
            "milestones": milestones,
        })

    # Epics/milestones without a phase
    orphan_epics = [e for e in _epics.values() if e["project_id"] == project_id and not e.get("phase_id")]
    orphan_milestones = [m for m in _milestones.values() if m["project_id"] == project_id and not m.get("phase_id")]

    return {
        "project_id": project_id,
        "project_name": project.name,
        "phases": hierarchy,
        "unphased_epics": orphan_epics,
        "unphased_milestones": orphan_milestones,
    }
