"""Automation Rules Engine API Router."""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from app.database import get_db
from app.models import User, AutomationRule, AutomationLog, Task
from app.utils import get_current_active_user
from app.services.automation_engine import run_automation_rules
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Schemas ─────────────────────────────────────────────────────────────────

class AutomationActionInput(BaseModel):
    type: str
    params: dict = {}


class AutomationRuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    trigger_event: str
    trigger_conditions: Optional[dict] = None
    actions: List[AutomationActionInput]
    project_id: Optional[str] = None
    team_id: Optional[str] = None
    priority: int = 0
    is_active: bool = True


class AutomationRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger_event: Optional[str] = None
    trigger_conditions: Optional[dict] = None
    actions: Optional[List[AutomationActionInput]] = None
    project_id: Optional[str] = None
    team_id: Optional[str] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None


def _build_rule_response(rule: AutomationRule) -> dict:
    return {
        "id": rule.id,
        "name": rule.name,
        "description": rule.description,
        "trigger_event": rule.trigger_event,
        "trigger_conditions": rule.trigger_conditions or {},
        "conditions": rule.trigger_conditions or {},   # alias for frontend
        "actions": rule.actions or [],
        "project_id": rule.project_id,
        "team_id": rule.team_id,
        "priority": rule.priority,
        "is_active": rule.is_active,
        # Frontend expects trigger_count / last_triggered_at
        "trigger_count": rule.run_count or 0,
        "run_count": rule.run_count or 0,
        "last_triggered_at": rule.last_run_at.isoformat() if rule.last_run_at else None,
        "last_run_at": rule.last_run_at.isoformat() if rule.last_run_at else None,
        "created_at": rule.created_at.isoformat() if rule.created_at else None,
        "created_by_id": rule.created_by_id,
        "updated_at": rule.updated_at.isoformat() if rule.updated_at else None,
    }


# ─── Rules Endpoints ─────────────────────────────────────────────────────────

@router.get("/rules")
async def list_rules(
    project_id: Optional[str] = None,
    team_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    trigger_event: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List automation rules."""
    q = db.query(AutomationRule)
    if project_id:
        q = q.filter(AutomationRule.project_id == project_id)
    if team_id:
        q = q.filter(AutomationRule.team_id == team_id)
    if is_active is not None:
        q = q.filter(AutomationRule.is_active == is_active)
    if trigger_event:
        q = q.filter(AutomationRule.trigger_event == trigger_event)
    rules = q.order_by(desc(AutomationRule.priority), AutomationRule.created_at).offset(skip).limit(limit).all()
    return [_build_rule_response(r) for r in rules]


@router.post("/rules", status_code=status.HTTP_201_CREATED)
async def create_rule(
    data: AutomationRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new automation rule."""
    rule = AutomationRule(
        name=data.name,
        description=data.description,
        trigger_event=data.trigger_event,
        trigger_conditions=data.trigger_conditions,
        actions=[a.dict() for a in data.actions],
        project_id=data.project_id,
        team_id=data.team_id,
        priority=data.priority,
        is_active=data.is_active,
        created_by_id=str(current_user.id),
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    logger.info(f"Automation rule created: {rule.name} by {current_user.email}")
    return _build_rule_response(rule)


@router.get("/rules/{rule_id}")
async def get_rule(
    rule_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a single automation rule."""
    rule = db.query(AutomationRule).filter(AutomationRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return _build_rule_response(rule)


@router.put("/rules/{rule_id}")
async def update_rule(
    rule_id: str,
    data: AutomationRuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update an automation rule."""
    rule = db.query(AutomationRule).filter(AutomationRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    update_data = data.dict(exclude_none=True)
    if "actions" in update_data:
        update_data["actions"] = [a.dict() if hasattr(a, "dict") else a for a in (data.actions or [])]
    for k, v in update_data.items():
        setattr(rule, k, v)
    rule.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(rule)
    return _build_rule_response(rule)


@router.patch("/rules/{rule_id}")
async def patch_rule(
    rule_id: str,
    data: AutomationRuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Patch an automation rule (alias for PUT)."""
    rule = db.query(AutomationRule).filter(AutomationRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    update_data = data.dict(exclude_none=True)
    if "actions" in update_data:
        update_data["actions"] = [a.dict() if hasattr(a, "dict") else a for a in (data.actions or [])]
    for k, v in update_data.items():
        setattr(rule, k, v)
    rule.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(rule)
    return _build_rule_response(rule)


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(
    rule_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete an automation rule."""
    rule = db.query(AutomationRule).filter(AutomationRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(rule)
    db.commit()


@router.post("/rules/{rule_id}/test")
async def test_rule(
    rule_id: str,
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Fire a rule against a specific task immediately for testing."""
    rule = db.query(AutomationRule).filter(AutomationRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    run_automation_rules(task, rule.trigger_event, db, actor_id=str(current_user.id))
    return {"status": "fired", "rule_id": rule_id, "task_id": task_id}


# ─── Execution Logs ───────────────────────────────────────────────────────────

@router.get("/logs")
async def list_logs(
    rule_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List automation execution logs."""
    q = db.query(AutomationLog)
    if rule_id:
        q = q.filter(AutomationLog.rule_id == rule_id)
    if status_filter:
        q = q.filter(AutomationLog.status == status_filter)
    logs = q.order_by(desc(AutomationLog.created_at)).offset(skip).limit(limit).all()
    return [
        {
            "id": l.id,
            "rule_id": l.rule_id,
            "rule_name": l.rule.name if l.rule else None,
            "trigger_event": l.trigger_event,
            "entity_type": l.trigger_entity_type,
            "entity_id": l.trigger_entity_id,
            "status": l.status,
            "actions_executed": l.actions_executed,
            "error_message": l.error_message,
            "executed_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs
    ]


# ─── SLA Scanner ─────────────────────────────────────────────────────────────

@router.post("/scan/sla-breaches")
async def scan_sla_breaches(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Trigger SLA breach scan in background."""
    def _scan(db: Session):
        from datetime import date
        from sqlalchemy import and_
        overdue_tasks = db.query(Task).filter(
            and_(
                Task.due_date < datetime.utcnow(),
                Task.status.notin_(["completed", "cancelled"]),
            )
        ).limit(500).all()
        for task in overdue_tasks:
            run_automation_rules(task, "task_overdue", db)

    background_tasks.add_task(_scan, db)
    return {"status": "scan_started"}


# ─── Stats ────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get automation stats summary."""
    total = db.query(AutomationRule).count()
    active = db.query(AutomationRule).filter(AutomationRule.is_active == True).count()
    total_logs = db.query(AutomationLog).count()
    success_logs = db.query(AutomationLog).filter(AutomationLog.status == "success").count()
    failed_logs = db.query(AutomationLog).filter(AutomationLog.status == "failed").count()
    return {
        "total_rules": total,
        "active_rules": active,
        "total_executions": total_logs,
        "successful_executions": success_logs,
        "failed_executions": failed_logs,
    }
