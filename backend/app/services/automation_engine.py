"""
Automation Execution Engine.
Evaluates AutomationRule records against task lifecycle events.
Supported actions: auto_assign, change_status, send_notification,
                   add_label, create_subtask, webhook.
"""
from typing import Optional
from sqlalchemy.orm import Session
from app.models import AutomationRule, AutomationLog, Notification, Task
import uuid, json
from datetime import datetime


def run_automation_rules(task, event_type: str, db: Session, actor_id: Optional[str] = None):
    """
    Evaluate all active automation rules against a task event.
    
    :param task:       The Task model instance (after create/update)
    :param event_type: One of 'task_created', 'task_updated', 'status_changed',
                       'assigned', 'due_soon', 'overdue'
    :param db:         SQLAlchemy session
    :param actor_id:   User ID of who triggered the event
    """
    try:
        rules = db.query(AutomationRule).filter(
            AutomationRule.is_active == True,
        ).all()

        for rule in rules:
            try:
                _evaluate_rule(rule, task, event_type, db, actor_id)
            except Exception:
                # Never let a single rule crash the request
                pass
    except Exception:
        pass


def _evaluate_rule(rule: AutomationRule, task, event_type: str, db: Session, actor_id: Optional[str]):
    """Evaluate a single rule against the task event."""
    # New schema: trigger_event (str) + actions (list of {type, params})
    trigger_event = getattr(rule, "trigger_event", None) or ""
    trigger_conditions = rule.trigger_conditions or {}
    actions = rule.actions or []

    # Fallback: old schema stored as trigger/action dicts
    if not trigger_event and hasattr(rule, "trigger"):
        trigger = rule.trigger or {}
        if isinstance(trigger, dict):
            trigger_event = trigger.get("event", "")
            trigger_conditions = trigger.get("conditions", {})
        else:
            trigger_event = str(trigger)

    if not trigger_event or (trigger_event != event_type and trigger_event != "any"):
        return
    if not _check_conditions(task, trigger_conditions):
        return

    executed: list[str] = []
    errors: list[str] = []

    # Iterate over actions list (new schema: [{type, params}])
    for action in (actions if isinstance(actions, list) else [actions]):
        if isinstance(action, dict):
            action_type = action.get("type", "")
            action_params = action.get("params", {})
        else:
            # old string format
            action_type = str(action)
            action_params = {}
        try:
            _execute_action(action_type, action_params, task, db, actor_id)
            executed.append(action_type)
        except Exception as e:
            errors.append(f"{action_type}: {e}")

    # Persist execution log
    try:
        log = AutomationLog(
            id=str(uuid.uuid4()),
            rule_id=rule.id,
            trigger_event=event_type,
            trigger_entity_type="task",
            trigger_entity_id=str(task.id),
            status="success" if not errors else ("partial" if executed else "failed"),
            actions_executed=executed,
            error_message="; ".join(errors) if errors else None,
            created_at=datetime.utcnow(),
        )
        db.add(log)
        # Update rule stats
        rule.run_count = (rule.run_count or 0) + 1
        rule.last_run_at = datetime.utcnow()
        db.commit()
    except Exception:
        db.rollback()


def _check_conditions(task, conditions: dict) -> bool:
    """Check if a task satisfies all trigger conditions."""
    if not conditions:
        return True

    # Priority condition
    if "priority" in conditions:
        task_priority = getattr(task, "priority", None)
        if task_priority != conditions["priority"]:
            return False

    # Project condition
    if "project_id" in conditions:
        if str(getattr(task, "project_id", "")) != str(conditions["project_id"]):
            return False

    # Status condition
    if "status" in conditions:
        if str(getattr(task, "status", "")) != str(conditions["status"]):
            return False

    return True


def _execute_action(action_type: str, params: dict, task, db: Session, actor_id: Optional[str]):
    """Execute the automation action."""
    from app.models import User

    if action_type == "auto_assign" or action_type == "assign_user":
        assignee_id = params.get("assignee_id") or params.get("user_id")
        if assignee_id and hasattr(task, "assignee_id"):
            if not task.assignee_id:  # Only auto-assign if unassigned
                task.assignee_id = assignee_id
                db.commit()

    elif action_type == "change_status" or action_type == "set_status":
        new_status = params.get("status") or params.get("value")
        if new_status and hasattr(task, "status"):
            task.status = new_status
            db.commit()

    elif action_type == "send_notification" or action_type == "notify":
        _send_notification(params, task, db)

    elif action_type == "add_label" or action_type == "set_tag":
        tag = params.get("tag") or params.get("label")
        if tag and hasattr(task, "tags"):
            existing = list(task.tags or [])
            if tag not in existing:
                existing.append(tag)
                task.tags = existing
                db.commit()

    elif action_type == "create_subtask":
        subtask_name = params.get("name") or f"Sub-task of {getattr(task, 'name', 'task')}"
        parent_id = str(task.id)
        project_id = str(task.project_id) if getattr(task, "project_id", None) else None
        assignee_id = str(params.get("assignee_id")) if params.get("assignee_id") else None
        subtask = Task(
            id=str(uuid.uuid4()),
            name=subtask_name,
            status="todo",
            priority=params.get("priority") or getattr(task, "priority", "medium"),
            parent_id=parent_id,
            project_id=project_id,
            assignee_id=assignee_id,
            task_type=getattr(task, "task_type", "project"),
            created_at=datetime.utcnow(),
        )
        db.add(subtask)
        db.commit()

    elif action_type == "webhook" or action_type == "call_webhook":
        url = params.get("url", "")
        if url:
            try:
                import threading, requests
                payload = {
                    "event": "automation_trigger",
                    "task_id": str(getattr(task, "id", "")),
                    "task_name": getattr(task, "name", ""),
                    "task_status": getattr(task, "status", ""),
                    "actor_id": str(actor_id or ""),
                }
                threading.Thread(
                    target=lambda: requests.post(url, json=payload, timeout=10),
                    daemon=True,
                ).start()
            except Exception:
                pass


def _send_notification(params: dict, task, db: Session):
    """Create an in-app notification as specified by the automation rule."""
    target_user_id = params.get("user_id") or getattr(task, "assignee_id", None)
    if not target_user_id:
        return

    task_name = getattr(task, "name", "") or getattr(task, "title", "")
    title = params.get("title") or "Automation Alert"
    message = params.get("message") or f"Automation triggered for task: {task_name}"
    link = params.get("link") or f"/my-time"

    notification = Notification(
        id=str(uuid.uuid4()),
        user_id=target_user_id,
        type="automation",
        title=title,
        message=message,
        link=link,
        is_read=False,
        created_at=datetime.utcnow(),
    )
    db.add(notification)
    try:
        db.commit()
    except Exception:
        db.rollback()
