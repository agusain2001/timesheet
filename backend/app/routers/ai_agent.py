"""
AI Agent Router — Full Agentic LLM with Gemini Function Calling
Comprehensive tool set: CRUD tasks, update status/priority, log time, search, 
workload summaries, priority analysis, risk assessment, and more.
"""

from fastapi import APIRouter, Depends, Query

from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime, timedelta
import uuid
import json

from app.database import get_db
from app.models import User, Task, Project, Timesheet, TimeEntry, Expense, ChatHistory
from app.utils import get_current_active_user
from app.config import get_settings

router = APIRouter()
settings = get_settings()


# ─── Schemas ──────────────────────────────────────────────────────────────────

class AgentChatRequest(BaseModel):
    message: str
    mode: str = "assistant"
    conversation_history: Optional[List[Dict[str, str]]] = None


class ToolCall(BaseModel):
    tool_name: str
    args: Dict[str, Any]
    result: Any


class AgentChatResponse(BaseModel):
    response: str
    tool_calls: List[ToolCall] = []
    data: Optional[Dict[str, Any]] = None


# ─── Database context ─────────────────────────────────────────────────────────

def get_user_context(user: User, db: Session) -> Dict[str, Any]:
    today = datetime.utcnow().date()
    week_start = today - timedelta(days=today.weekday())

    tasks = db.query(Task).filter(
        Task.assignee_id == user.id,
        Task.status.in_(["open", "todo", "in_progress", "backlog", "waiting", "blocked"])
    ).order_by(Task.due_date.asc().nullslast()).limit(50).all()

    completed_today = db.query(Task).filter(
        Task.assignee_id == user.id,
        Task.status == "completed",
        func.date(Task.completed_at) == today
    ).count()

    hours_week = db.query(func.sum(TimeEntry.hours)).join(Timesheet).filter(
        Timesheet.user_id == user.id,
        TimeEntry.day >= week_start
    ).scalar() or 0.0

    hours_today = db.query(func.sum(TimeEntry.hours)).join(Timesheet).filter(
        Timesheet.user_id == user.id,
        TimeEntry.day == today
    ).scalar() or 0.0

    projects = db.query(Project).filter(Project.status == "active").limit(20).all()

    pending_expenses = db.query(Expense).filter(
        Expense.user_id == user.id,
        Expense.status == "pending"
    ).count()

    overdue = [t for t in tasks if t.due_date and t.due_date.date() < today]
    high_priority = [t for t in tasks if t.priority in ("high", "urgent")]

    return {
        "user_id": str(user.id),
        "user_name": user.full_name,
        "user_role": user.role,
        "today": today.isoformat(),
        "week_start": week_start.isoformat(),
        "hours_today": float(hours_today),
        "hours_week": float(hours_week),
        "completed_today": completed_today,
        "pending_expenses": pending_expenses,
        "active_projects": len(projects),
        "project_names": [p.name for p in projects],
        "project_ids": {p.name: p.id for p in projects},
        "tasks": [
            {
                "id": t.id,
                "name": t.name,
                "description": t.description or "",
                "status": t.status,
                "priority": t.priority,
                "due_date": t.due_date.date().isoformat() if t.due_date else None,
                "estimated_hours": t.estimated_hours,
                "actual_hours": t.actual_hours or 0,
                "tags": t.tags or [],
                "project_id": t.project_id,
            }
            for t in tasks
        ],
        "overdue_count": len(overdue),
        "high_priority_count": len(high_priority),
    }


# ─── Tool implementations ─────────────────────────────────────────────────────

def tool_list_tasks(ctx: Dict, status: Optional[str] = None, priority: Optional[str] = None) -> Dict:
    tasks = ctx["tasks"]
    if status:
        tasks = [t for t in tasks if t["status"] == status]
    if priority:
        tasks = [t for t in tasks if t["priority"] == priority]
    return {"tasks": tasks, "total": len(tasks)}


def tool_search_tasks(db: Session, user_id: str, query: str) -> Dict:
    """Search tasks by name or description."""
    tasks = db.query(Task).filter(
        Task.assignee_id == user_id,
        or_(
            Task.name.ilike(f"%{query}%"),
            Task.description.ilike(f"%{query}%"),
        )
    ).limit(20).all()
    return {
        "tasks": [
            {"id": t.id, "name": t.name, "status": t.status, "priority": t.priority,
             "due_date": t.due_date.date().isoformat() if t.due_date else None}
            for t in tasks
        ],
        "total": len(tasks),
    }


def tool_get_task_details(db: Session, task_id: str) -> Dict:
    """Get full details of a specific task."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return {"error": "Task not found"}
    project_name = None
    if task.project_id:
        proj = db.query(Project).filter(Project.id == task.project_id).first()
        project_name = proj.name if proj else None
    return {
        "id": task.id, "name": task.name, "description": task.description or "",
        "status": task.status, "priority": task.priority,
        "due_date": task.due_date.date().isoformat() if task.due_date else None,
        "start_date": task.start_date.date().isoformat() if task.start_date else None,
        "estimated_hours": task.estimated_hours, "actual_hours": task.actual_hours or 0,
        "tags": task.tags or [], "project": project_name,
        "created_at": task.created_at.isoformat() if task.created_at else None,
    }


def tool_create_task(db: Session, user: User, name: str, priority: str = "medium",
                     due_date: Optional[str] = None, description: Optional[str] = None,
                     project_id: Optional[str] = None, estimated_hours: Optional[float] = None,
                     tags: Optional[str] = None) -> Dict:
    """Create a new task."""
    parsed_due = _parse_date(due_date)
    parsed_tags = [t.strip() for t in tags.split(",")] if tags else None

    task = Task(
        id=str(uuid.uuid4()),
        name=name,
        description=description or "",
        priority=priority if priority in ("low", "medium", "high", "urgent") else "medium",
        status="todo",
        task_type="personal",
        assignee_id=str(user.id),
        owner_id=str(user.id),
        due_date=parsed_due,
        project_id=project_id,
        estimated_hours=estimated_hours,
        tags=parsed_tags,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return {
        "task_id": task.id, "name": task.name, "priority": task.priority,
        "status": task.status, "due_date": task.due_date.date().isoformat() if task.due_date else None,
    }


def tool_update_task(db: Session, task_id: str, name: Optional[str] = None,
                     description: Optional[str] = None, priority: Optional[str] = None,
                     status: Optional[str] = None, due_date: Optional[str] = None,
                     estimated_hours: Optional[float] = None, tags: Optional[str] = None) -> Dict:
    """Update an existing task's fields."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return {"error": "Task not found"}
    
    changes = []
    if name:
        task.name = name; changes.append(f"name → {name}")
    if description is not None:
        task.description = description; changes.append("description updated")
    if priority and priority in ("low", "medium", "high", "urgent"):
        old = task.priority; task.priority = priority; changes.append(f"priority: {old} → {priority}")
    if status and status in ("todo", "in_progress", "completed", "backlog", "waiting", "blocked", "open"):
        old = task.status; task.status = status; changes.append(f"status: {old} → {status}")
        if status == "completed":
            task.completed_at = datetime.utcnow()
    if due_date:
        task.due_date = _parse_date(due_date); changes.append(f"due date → {due_date}")
    if estimated_hours is not None:
        task.estimated_hours = estimated_hours; changes.append(f"estimated hours → {estimated_hours}")
    if tags:
        task.tags = [t.strip() for t in tags.split(",")]; changes.append("tags updated")
    
    db.commit()
    return {"task_id": task.id, "task_name": task.name, "changes": changes}


def tool_complete_task(db: Session, task_id: str) -> Dict:
    """Mark a task as completed."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return {"error": "Task not found"}
    old_status = task.status
    task.status = "completed"
    task.completed_at = datetime.utcnow()
    db.commit()
    return {"task_id": task.id, "task_name": task.name, "old_status": old_status, "new_status": "completed"}


def tool_delete_task(db: Session, task_id: str) -> Dict:
    """Delete a task permanently."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return {"error": "Task not found"}
    name = task.name
    db.delete(task)
    db.commit()
    return {"deleted": True, "task_name": name}


def tool_get_priority_suggestions(db: Session, user_id: str) -> List[Dict]:
    from app.services.ai_task_service import AITaskService
    ai_svc = AITaskService(db)
    tasks = db.query(Task).filter(
        Task.assignee_id == user_id,
        Task.status.in_(["todo", "in_progress", "backlog", "waiting", "blocked", "open"])
    ).limit(30).all()
    results = []
    for task in tasks:
        score = ai_svc.calculate_priority_score(task)
        suggested = "urgent" if score >= 80 else "high" if score >= 60 else "medium" if score >= 40 else "low"
        results.append({
            "task_id": task.id, "task_name": task.name, "priority_score": round(score, 1),
            "current_priority": task.priority, "suggested_priority": suggested,
            "due_date": task.due_date.date().isoformat() if task.due_date else None,
        })
    results.sort(key=lambda x: x["priority_score"], reverse=True)
    return results[:20]


def tool_get_deadline_risks(db: Session, user_id: str) -> List[Dict]:
    from app.services.ai_task_service import AITaskService
    ai_svc = AITaskService(db)
    tasks = db.query(Task).filter(
        Task.assignee_id == user_id,
        Task.status.in_(["todo", "in_progress", "waiting", "blocked", "open"]),
        Task.due_date != None
    ).limit(30).all()
    results = []
    for task in tasks:
        risk = ai_svc.predict_deadline_risk(task)
        results.append({
            "task_id": task.id, "task_name": task.name,
            "due_date": task.due_date.date().isoformat() if task.due_date else None,
            "risk_score": risk["risk_score"], "risk_level": risk["risk_level"], "factors": risk["factors"],
        })
    results.sort(key=lambda x: x["risk_score"], reverse=True)
    return results[:20]


def tool_apply_priority(db: Session, task_id: str) -> Dict:
    from app.services.ai_task_service import AITaskService
    ai_svc = AITaskService(db)
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return {"error": "Task not found"}
    score = ai_svc.calculate_priority_score(task)
    new_priority = "urgent" if score >= 80 else "high" if score >= 60 else "medium" if score >= 40 else "low"
    old_priority = task.priority
    task.priority = new_priority
    task.ai_priority_score = score
    db.commit()
    return {"task_id": task.id, "task_name": task.name, "old_priority": old_priority, "new_priority": new_priority}


def tool_log_time(db: Session, user: User, hours: float, project_id: Optional[str] = None,
                  task_id: Optional[str] = None, notes: Optional[str] = None,
                  day: Optional[str] = None) -> Dict:
    """Log time entry for the user."""
    today = datetime.utcnow().date()
    target_day = today
    if day:
        try:
            target_day = datetime.strptime(day, "%Y-%m-%d").date()
        except ValueError:
            if "yesterday" in day.lower():
                target_day = today - timedelta(days=1)

    week_start = target_day - timedelta(days=target_day.weekday())
    
    # Find or create timesheet
    timesheet = db.query(Timesheet).filter(
        Timesheet.user_id == str(user.id),
        Timesheet.week_starting == week_start
    ).first()
    
    if not timesheet:
        timesheet = Timesheet(
            id=str(uuid.uuid4()),
            user_id=str(user.id),
            week_starting=week_start,
            status="draft",
        )
        db.add(timesheet)
        db.flush()

    entry = TimeEntry(
        id=str(uuid.uuid4()),
        timesheet_id=timesheet.id,
        project_id=project_id,
        task_id=task_id,
        day=target_day,
        hours=hours,
        notes=notes or "",
    )
    db.add(entry)
    
    # Update task actual_hours if task provided
    if task_id:
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.actual_hours = (task.actual_hours or 0) + hours

    db.commit()
    return {"logged": True, "hours": hours, "day": target_day.isoformat(), "entry_id": entry.id}


def tool_get_workload_summary(db: Session, user: User) -> Dict:
    """Get comprehensive workload summary."""
    today = datetime.utcnow().date()
    week_start = today - timedelta(days=today.weekday())
    
    # Tasks by status
    all_tasks = db.query(Task).filter(Task.assignee_id == user.id).all()
    by_status = {}
    for t in all_tasks:
        by_status[t.status] = by_status.get(t.status, 0) + 1
    
    # Hours this week
    hours_week = db.query(func.sum(TimeEntry.hours)).join(Timesheet).filter(
        Timesheet.user_id == user.id, TimeEntry.day >= week_start
    ).scalar() or 0.0
    
    # Hours today
    hours_today = db.query(func.sum(TimeEntry.hours)).join(Timesheet).filter(
        Timesheet.user_id == user.id, TimeEntry.day == today
    ).scalar() or 0.0

    # Overdue
    overdue = db.query(Task).filter(
        Task.assignee_id == user.id,
        Task.status.in_(["todo", "in_progress", "open", "waiting"]),
        Task.due_date < datetime.utcnow()
    ).count()
    
    # Due this week
    week_end = week_start + timedelta(days=6)
    due_this_week = db.query(Task).filter(
        Task.assignee_id == user.id,
        Task.status.in_(["todo", "in_progress", "open"]),
        Task.due_date >= datetime.combine(week_start, datetime.min.time()),
        Task.due_date <= datetime.combine(week_end, datetime.max.time()),
    ).count()
    
    # Completed this week
    completed_week = db.query(Task).filter(
        Task.assignee_id == user.id,
        Task.status == "completed",
        Task.completed_at >= datetime.combine(week_start, datetime.min.time())
    ).count()

    return {
        "tasks_by_status": by_status,
        "total_active_tasks": sum(v for k, v in by_status.items() if k != "completed"),
        "hours_today": float(hours_today),
        "hours_this_week": float(hours_week),
        "overdue_tasks": overdue,
        "due_this_week": due_this_week,
        "completed_this_week": completed_week,
    }


def tool_get_projects(db: Session) -> List[Dict]:
    """List all active projects."""
    projects = db.query(Project).filter(Project.status == "active").limit(30).all()
    return [{"id": p.id, "name": p.name, "status": p.status} for p in projects]


# ─── Date parser helper ───────────────────────────────────────────────────────

def _parse_date(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        d = date_str.lower()
        if "today" in d: return datetime.utcnow()
        if "tomorrow" in d: return datetime.utcnow() + timedelta(days=1)
        if "next week" in d: return datetime.utcnow() + timedelta(days=7)
        if "next month" in d: return datetime.utcnow() + timedelta(days=30)
    return None


# ─── Dispatch tool calls ──────────────────────────────────────────────────────

def dispatch_tool(fn_name: str, fn_args: Dict, ctx: Dict, db: Session, user: User) -> Any:
    if fn_name == "list_tasks":
        return tool_list_tasks(ctx, **{k: v for k, v in fn_args.items() if k in ("status", "priority")})
    elif fn_name == "search_tasks":
        return tool_search_tasks(db, str(user.id), fn_args.get("query", ""))
    elif fn_name == "get_task_details":
        return tool_get_task_details(db, fn_args.get("task_id", ""))
    elif fn_name == "create_task":
        return tool_create_task(db, user, **fn_args)
    elif fn_name == "update_task":
        return tool_update_task(db, **fn_args)
    elif fn_name == "complete_task":
        return tool_complete_task(db, fn_args.get("task_id", ""))
    elif fn_name == "delete_task":
        return tool_delete_task(db, fn_args.get("task_id", ""))
    elif fn_name == "get_priority_suggestions":
        return tool_get_priority_suggestions(db, str(user.id))
    elif fn_name == "get_deadline_risks":
        return tool_get_deadline_risks(db, str(user.id))
    elif fn_name == "apply_priority":
        return tool_apply_priority(db, fn_args.get("task_id", ""))
    elif fn_name == "log_time":
        return tool_log_time(db, user, **fn_args)
    elif fn_name == "get_workload_summary":
        return tool_get_workload_summary(db, user)
    elif fn_name == "get_projects":
        return tool_get_projects(db)
    return {"error": f"Unknown tool: {fn_name}"}


# ─── Gemini tool definitions ─────────────────────────────────────────────────

def build_tools():
    from google.genai import types
    S = types.Schema
    T = types.Type
    FD = types.FunctionDeclaration

    return types.Tool(function_declarations=[
        FD(name="list_tasks", description="List the user's active tasks. Can filter by status or priority.",
           parameters=S(type=T.OBJECT, properties={
               "status": S(type=T.STRING, description="Filter: todo, in_progress, backlog, waiting, blocked, open"),
               "priority": S(type=T.STRING, description="Filter: low, medium, high, urgent"),
           })),
        FD(name="search_tasks", description="Search tasks by name or description keyword.",
           parameters=S(type=T.OBJECT, properties={
               "query": S(type=T.STRING, description="Search keyword"),
           }, required=["query"])),
        FD(name="get_task_details", description="Get full details of a specific task by ID.",
           parameters=S(type=T.OBJECT, properties={
               "task_id": S(type=T.STRING, description="The task ID"),
           }, required=["task_id"])),
        FD(name="create_task", description="Create a new task. Extract name, priority, due date, description from user's message.",
           parameters=S(type=T.OBJECT, properties={
               "name": S(type=T.STRING, description="Task title"),
               "priority": S(type=T.STRING, description="low, medium, high, or urgent"),
               "due_date": S(type=T.STRING, description="YYYY-MM-DD or 'today'/'tomorrow'/'next week'"),
               "description": S(type=T.STRING, description="Task description"),
               "estimated_hours": S(type=T.NUMBER, description="Estimated hours to complete"),
               "tags": S(type=T.STRING, description="Comma-separated tags"),
               "project_id": S(type=T.STRING, description="Project ID to assign to"),
           }, required=["name"])),
        FD(name="update_task", description="Update an existing task. Change name, description, priority, status, due_date, estimated_hours, or tags.",
           parameters=S(type=T.OBJECT, properties={
               "task_id": S(type=T.STRING, description="Task ID to update"),
               "name": S(type=T.STRING, description="New name"),
               "description": S(type=T.STRING, description="New description"),
               "priority": S(type=T.STRING, description="New priority: low/medium/high/urgent"),
               "status": S(type=T.STRING, description="New status: todo/in_progress/completed/backlog/waiting/blocked"),
               "due_date": S(type=T.STRING, description="New due date YYYY-MM-DD or relative"),
               "estimated_hours": S(type=T.NUMBER, description="Updated estimate"),
               "tags": S(type=T.STRING, description="Comma-separated tags"),
           }, required=["task_id"])),
        FD(name="complete_task", description="Mark a task as completed.",
           parameters=S(type=T.OBJECT, properties={
               "task_id": S(type=T.STRING, description="Task ID to complete"),
           }, required=["task_id"])),
        FD(name="delete_task", description="Permanently delete a task. Use with caution.",
           parameters=S(type=T.OBJECT, properties={
               "task_id": S(type=T.STRING, description="Task ID to delete"),
           }, required=["task_id"])),
        FD(name="get_priority_suggestions", description="Get AI priority analysis for all active tasks with scores and suggested priorities.",
           parameters=S(type=T.OBJECT, properties={})),
        FD(name="get_deadline_risks", description="Analyze which tasks are at risk of missing their deadline.",
           parameters=S(type=T.OBJECT, properties={})),
        FD(name="apply_priority", description="Apply the AI-suggested priority to a specific task.",
           parameters=S(type=T.OBJECT, properties={
               "task_id": S(type=T.STRING, description="Task ID"),
           }, required=["task_id"])),
        FD(name="log_time", description="Log time / hours worked. Creates a timesheet entry.",
           parameters=S(type=T.OBJECT, properties={
               "hours": S(type=T.NUMBER, description="Number of hours worked"),
               "project_id": S(type=T.STRING, description="Project ID (optional)"),
               "task_id": S(type=T.STRING, description="Task ID (optional)"),
               "notes": S(type=T.STRING, description="Notes about what was done"),
               "day": S(type=T.STRING, description="Date YYYY-MM-DD, default is today"),
           }, required=["hours"])),
        FD(name="get_workload_summary", description="Get comprehensive workload: tasks by status, hours logged, overdue count, due this week, etc.",
           parameters=S(type=T.OBJECT, properties={})),
        FD(name="get_projects", description="List all active projects with their IDs.",
           parameters=S(type=T.OBJECT, properties={})),
    ])


# ─── Agent loop ───────────────────────────────────────────────────────────────

def run_agent(message: str, mode: str, ctx: Dict, db: Session, user: User,
              conversation_history: Optional[List[Dict]] = None) -> AgentChatResponse:
    if not settings.gemini_api_key or len(settings.gemini_api_key) < 20:
        return AgentChatResponse(response="AI is not configured. Please set up the Gemini API key.")

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.gemini_api_key)

        task_list_text = "\n".join(
            f"  - [ID: {t['id'][:8]}] [{t['priority'].upper()}] {t['name']} | Status: {t['status']}" +
            (f" | Due: {t['due_date']}" if t['due_date'] else "")
            for t in ctx["tasks"][:25]
        ) or "  No active tasks"

        system_instruction = f"""You are an intelligent, autonomous AI agent for the TimeSheet project management system.
You have FULL ACCESS to {ctx['user_name']}'s data and can CREATE, READ, UPDATE, DELETE tasks, log time, and analyze workload.

IMPORTANT: You MUST use tools to perform actions. Do NOT just describe what you would do — actually DO it using the available tools.

When a user asks you to do something:
1. Understand the intent
2. Choose the right tool(s)
3. Execute the action
4. Report what you did

Context for {ctx['user_name']} ({ctx['user_role']}):
- Today: {ctx['today']}
- Active tasks: {len(ctx['tasks'])} ({ctx['overdue_count']} overdue, {ctx['high_priority_count']} high priority)
- Completed today: {ctx['completed_today']}
- Hours today: {ctx['hours_today']}, this week: {ctx['hours_week']}
- Projects: {ctx['active_projects']} ({', '.join(ctx['project_names'][:5])})
- Pending expenses: {ctx['pending_expenses']}

Current tasks (use these IDs for tool calls):
{task_list_text}

Available project IDs:
{json.dumps(ctx.get('project_ids', {}), indent=2)}

Mode: {mode}
"""
        if mode == "priorities":
            system_instruction += "\nFocus on prioritization. Use get_priority_suggestions proactively."
        elif mode == "risks":
            system_instruction += "\nFocus on deadline risks. Use get_deadline_risks proactively."
        else:
            system_instruction += """\n
Rules:
- When user says "create a task", use create_task tool
- When user says "mark X as done" or "complete X", use complete_task or update_task with status=completed
- When user says "change priority of X to high", use update_task
- When user says "log 2 hours on X", use log_time
- When user says "delete task X", use delete_task
- When user asks "what should I work on", use get_priority_suggestions or get_workload_summary
- When user asks about a specific task, use search_tasks first to find it, then get_task_details
- When user says "update task X" with multiple changes, use update_task with all fields at once
- ALWAYS use the task ID from context when the user mentions a task by name
- Be concise, report what you did, and suggest next steps."""

        system_instruction += f"\nAddress {ctx['user_name'].split()[0]} by first name."

        tools = build_tools()

        # Conversation history
        history = []
        if conversation_history:
            for msg in conversation_history[-10:]:
                role = "user" if msg.get("role") == "user" else "model"
                history.append(types.Content(role=role, parts=[types.Part(text=msg.get("content", ""))]))

        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=[tools],
            temperature=0.5,
        )

        tool_calls_made: List[ToolCall] = []
        chat = client.chats.create(model="gemini-2.5-flash", history=history, config=config)
        response = chat.send_message(message)

        # Agentic loop
        max_iterations = 8
        iteration = 0
        while iteration < max_iterations:
            iteration += 1
            has_function_calls = False
            function_responses = []

            for part in response.candidates[0].content.parts:
                if part.function_call:
                    has_function_calls = True
                    fn_name = part.function_call.name
                    fn_args = dict(part.function_call.args) if part.function_call.args else {}

                    try:
                        result = dispatch_tool(fn_name, fn_args, ctx, db, user)
                    except Exception as e:
                        result = {"error": str(e)}

                    tool_calls_made.append(ToolCall(tool_name=fn_name, args=fn_args, result=result))
                    result_dict = result if isinstance(result, dict) else {"data": result}
                    function_responses.append(
                        types.Part(function_response=types.FunctionResponse(name=fn_name, response=result_dict))
                    )

            if not has_function_calls:
                break

            response = chat.send_message(function_responses)

        # Extract final text
        final_text = ""
        for part in response.candidates[0].content.parts:
            if hasattr(part, "text") and part.text:
                final_text += part.text

        # Build data payload for frontend
        data = None
        for tc in tool_calls_made:
            if tc.tool_name == "get_priority_suggestions" and isinstance(tc.result, list):
                data = {"type": "priorities", "items": tc.result}; break
            elif tc.tool_name == "get_deadline_risks" and isinstance(tc.result, list):
                data = {"type": "risks", "items": tc.result}; break
            elif tc.tool_name == "create_task" and isinstance(tc.result, dict) and "task_id" in tc.result:
                data = {"type": "task_created", "task": tc.result}; break
            elif tc.tool_name in ("list_tasks", "search_tasks") and isinstance(tc.result, dict):
                data = {"type": "task_list", "items": tc.result.get("tasks", []), "total": tc.result.get("total", 0)}; break
            elif tc.tool_name == "apply_priority" and isinstance(tc.result, dict) and "task_id" in tc.result:
                data = {"type": "priority_applied", "task": tc.result}; break
            elif tc.tool_name == "complete_task" and isinstance(tc.result, dict) and "task_id" in tc.result:
                data = {"type": "task_completed", "task": tc.result}; break
            elif tc.tool_name == "update_task" and isinstance(tc.result, dict) and "task_id" in tc.result:
                data = {"type": "task_updated", "task": tc.result}; break
            elif tc.tool_name == "delete_task" and isinstance(tc.result, dict) and tc.result.get("deleted"):
                data = {"type": "task_deleted", "task": tc.result}; break
            elif tc.tool_name == "log_time" and isinstance(tc.result, dict) and tc.result.get("logged"):
                data = {"type": "time_logged", "entry": tc.result}; break
            elif tc.tool_name == "get_workload_summary" and isinstance(tc.result, dict):
                data = {"type": "workload_summary", "summary": tc.result}; break

        return AgentChatResponse(
            response=final_text.strip() or "Done! Let me know if you need anything else.",
            tool_calls=tool_calls_made,
            data=data,
        )

    except Exception as e:
        print(f"[AI Agent] Error: {e}")
        import traceback
        traceback.print_exc()
        first_name = ctx["user_name"].split()[0]
        return AgentChatResponse(
            response=f"Sorry {first_name}, I ran into an issue ({type(e).__name__}). You have {len(ctx['tasks'])} active tasks ({ctx['overdue_count']} overdue). What can I help you with?",
        )


# ─── REST Endpoints ───────────────────────────────────────────────────────────

@router.post("/chat", response_model=AgentChatResponse)
async def agent_chat(
    request: AgentChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    ctx = get_user_context(current_user, db)
    return run_agent(request.message, request.mode, ctx, db, current_user, request.conversation_history)


@router.get("/context")
async def get_context(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return get_user_context(current_user, db)


@router.get("/priorities")
async def get_priorities(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return tool_get_priority_suggestions(db, str(current_user.id))


@router.get("/risks")
async def get_risks(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return tool_get_deadline_risks(db, str(current_user.id))


@router.post("/apply-priority/{task_id}")
async def apply_priority(task_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return tool_apply_priority(db, task_id)


# ─── Chat History Endpoints ───────────────────────────────────────────────────

class SaveMessageRequest(BaseModel):
    role: str
    content: str
    metadata: Optional[Dict[str, Any]] = None


@router.get("/history")
async def get_history(
    skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user),
):
    messages = db.query(ChatHistory).filter(
        ChatHistory.user_id == str(current_user.id)
    ).order_by(ChatHistory.created_at.asc()).offset(skip).limit(limit).all()
    return [{"id": m.id, "role": m.role, "content": m.content, "metadata": m.metadata_ or {},
             "created_at": m.created_at.isoformat() if m.created_at else None} for m in messages]


@router.post("/history")
async def save_message(request: SaveMessageRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    msg = ChatHistory(id=str(uuid.uuid4()), user_id=str(current_user.id), role=request.role,
                      content=request.content, metadata_=request.metadata or {})
    db.add(msg); db.commit()
    return {"id": msg.id, "saved": True}


@router.delete("/history")
async def clear_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    count = db.query(ChatHistory).filter(ChatHistory.user_id == str(current_user.id)).delete()
    db.commit()
    return {"cleared": count}
