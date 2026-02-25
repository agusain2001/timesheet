"""
Chat Integration Router — Slack & Microsoft Teams webhook support.
Handles incoming commands and outgoing notifications to chat platforms.
"""
import uuid
import json
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import User, Task, Project
from app.utils import get_current_active_user

try:
    import httpx
    _has_httpx = True
except ImportError:
    _has_httpx = False

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────────────────────────

class ChatWebhookConfig(BaseModel):
    platform: str  # "slack" or "teams"
    webhook_url: str
    channel: Optional[str] = None
    events: list[str] = ["task.created", "task.completed"]

class ChatNotifyRequest(BaseModel):
    webhook_url: str
    platform: str = "slack"
    message: str
    project_id: Optional[str] = None


# ─── Incoming Webhooks (Slash Commands) ───────────────────────────────────────

@router.post("/slack/commands", summary="Receive Slack slash commands")
async def slack_command(request: Request, db: Session = Depends(get_db)):
    """
    Handle incoming Slack slash commands.
    Example: /lightidea create-task "Fix login bug"
    """
    form = await request.form()
    text = form.get("text", "")
    user_name = form.get("user_name", "unknown")
    channel = form.get("channel_name", "general")

    parts = str(text).strip().split(" ", 1)
    command = parts[0].lower() if parts else ""
    args = parts[1] if len(parts) > 1 else ""

    if command == "status":
        # Return project status summary
        total = db.query(Task).count()
        completed = db.query(Task).filter(Task.status == "completed").count()
        in_progress = db.query(Task).filter(Task.status == "in_progress").count()
        return {
            "response_type": "in_channel",
            "text": f"📊 *Project Status*\n"
                    f"• Total tasks: {total}\n"
                    f"• In progress: {in_progress}\n"
                    f"• Completed: {completed}\n"
                    f"• Completion rate: {round(completed/max(total,1)*100)}%"
        }

    if command == "create-task" and args:
        task_name = args.strip('"').strip("'")
        new_task = Task(
            id=str(uuid.uuid4()),
            name=task_name,
            status="todo",
            priority="medium",
            created_at=datetime.utcnow(),
        )
        db.add(new_task)
        db.commit()
        return {
            "response_type": "ephemeral",
            "text": f"✅ Task created: *{task_name}* (ID: `{new_task.id[:8]}`)"
        }

    return {
        "response_type": "ephemeral",
        "text": (
            "🤖 *LightIDEA Bot Commands:*\n"
            "• `/lightidea status` — Project summary\n"
            "• `/lightidea create-task \"Task Name\"` — Create a quick task"
        )
    }


@router.post("/teams/commands", summary="Receive MS Teams incoming webhook")
async def teams_command(request: Request, db: Session = Depends(get_db)):
    """Handle incoming Microsoft Teams webhook messages."""
    body = await request.json()
    text = body.get("text", "").strip()

    parts = text.split(" ", 1)
    command = parts[0].lower() if parts else ""

    if command == "status":
        total = db.query(Task).count()
        completed = db.query(Task).filter(Task.status == "completed").count()
        return {
            "type": "message",
            "text": f"📊 Project Status: {completed}/{total} tasks completed ({round(completed/max(total,1)*100)}%)"
        }

    return {
        "type": "message",
        "text": "🤖 Commands: `status`, `create-task \"Name\"`"
    }


# ─── Outgoing Notifications ──────────────────────────────────────────────────

@router.post("/slack/notify", summary="Send notification to Slack channel")
async def notify_slack(
    req: ChatNotifyRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Send a notification message to a Slack channel via incoming webhook."""
    if not _has_httpx:
        raise HTTPException(status_code=500, detail="httpx not installed")

    payload = {"text": req.message}
    if req.project_id:
        payload["text"] = f"[Project: {req.project_id[:8]}] {req.message}"

    async with httpx.AsyncClient() as client:
        resp = await client.post(req.webhook_url, json=payload, timeout=10)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Slack returned {resp.status_code}")

    return {"status": "sent", "platform": "slack"}


@router.post("/teams/notify", summary="Send notification to Teams channel")
async def notify_teams(
    req: ChatNotifyRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Send a notification message to a Microsoft Teams channel via incoming webhook."""
    if not _has_httpx:
        raise HTTPException(status_code=500, detail="httpx not installed")

    payload = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "summary": "LightIDEA Notification",
        "themeColor": "6366F1",
        "text": req.message,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(req.webhook_url, json=payload, timeout=10)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Teams returned {resp.status_code}")

    return {"status": "sent", "platform": "teams"}


# ─── Webhook Config CRUD ─────────────────────────────────────────────────────

@router.post("/chat-webhooks", summary="Save a chat webhook configuration")
async def save_chat_webhook(
    config: ChatWebhookConfig,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Save a Slack/Teams webhook configuration."""
    from app.models.integration import Integration

    integration = Integration(
        id=str(uuid.uuid4()),
        name=f"{config.platform.title()} Integration",
        type="chat",
        provider=config.platform,
        config={"webhook_url": config.webhook_url, "channel": config.channel, "events": config.events},
        is_active=True,
    )
    db.add(integration)
    db.commit()
    return {"id": integration.id, "platform": config.platform, "status": "saved"}


@router.get("/chat-webhooks", summary="List chat webhook configurations")
async def list_chat_webhooks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all configured chat integrations."""
    from app.models.integration import Integration

    items = db.query(Integration).filter(Integration.type == "chat").all()
    return [
        {
            "id": i.id,
            "name": i.name,
            "platform": i.provider,
            "config": i.config,
            "is_active": i.is_active,
        }
        for i in items
    ]
