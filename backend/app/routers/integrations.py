"""Webhooks and Integrations API router."""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
import hashlib
import hmac
import httpx
import json

from app.database import get_db
from app.models import User, Webhook, WebhookLog, Integration
from app.utils import get_current_active_user

router = APIRouter()

# Schemas
class WebhookCreate(BaseModel):
    name: str
    url: str
    events: List[str]
    secret: Optional[str] = None
    project_id: Optional[str] = None
    headers: Optional[dict] = None

class WebhookUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    events: Optional[List[str]] = None
    is_active: Optional[bool] = None
    headers: Optional[dict] = None

class WebhookResponse(BaseModel):
    id: str
    name: str
    url: str
    events: List[str]
    is_active: bool
    last_triggered_at: Optional[datetime] = None
    failure_count: int
    created_at: datetime
    class Config:
        from_attributes = True

class IntegrationCreate(BaseModel):
    name: str
    type: str  # email, calendar, storage, chat
    provider: str  # smtp, gmail, google_calendar, slack, etc.
    config: Optional[dict] = None

class IntegrationResponse(BaseModel):
    id: str
    name: str
    type: str
    provider: str
    is_active: bool
    last_sync_at: Optional[datetime] = None
    created_at: datetime
    class Config:
        from_attributes = True

# Helper Functions
async def trigger_webhook(webhook: Webhook, event_type: str, payload: dict, db: Session):
    """Trigger a webhook with the given payload."""
    if not webhook.is_active:
        return
    
    # Prepare headers
    headers = {"Content-Type": "application/json"}
    if webhook.headers:
        headers.update(webhook.headers)
    
    # Sign payload if secret exists
    if webhook.secret:
        signature = hmac.new(
            webhook.secret.encode(),
            json.dumps(payload).encode(),
            hashlib.sha256
        ).hexdigest()
        headers["X-Webhook-Signature"] = f"sha256={signature}"
    
    # Create log entry
    log = WebhookLog(
        webhook_id=webhook.id,
        event_type=event_type,
        payload=payload,
        attempt_number=1
    )
    
    try:
        async with httpx.AsyncClient(timeout=webhook.timeout_seconds) as client:
            start = datetime.utcnow()
            response = await client.post(webhook.url, json=payload, headers=headers)
            elapsed = (datetime.utcnow() - start).total_seconds() * 1000
            
            log.status_code = response.status_code
            log.response_time_ms = int(elapsed)
            log.is_success = 200 <= response.status_code < 300
            
            if log.is_success:
                webhook.failure_count = 0
            else:
                webhook.failure_count += 1
                log.error_message = f"HTTP {response.status_code}"
    except Exception as e:
        log.is_success = False
        log.error_message = str(e)
        webhook.failure_count += 1
    
    webhook.last_triggered_at = datetime.utcnow()
    db.add(log)
    db.commit()

# Webhook Endpoints
@router.get("/webhooks", response_model=List[WebhookResponse])
def list_webhooks(
    project_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all webhooks."""
    query = db.query(Webhook)
    if project_id:
        query = query.filter(Webhook.project_id == project_id)
    return query.all()

@router.post("/webhooks", response_model=WebhookResponse, status_code=status.HTTP_201_CREATED)
def create_webhook(
    data: WebhookCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new webhook."""
    webhook = Webhook(
        name=data.name,
        url=data.url,
        events=data.events,
        secret=data.secret,
        project_id=data.project_id,
        headers=data.headers
    )
    db.add(webhook)
    db.commit()
    db.refresh(webhook)
    return webhook

@router.put("/webhooks/{webhook_id}", response_model=WebhookResponse)
def update_webhook(
    webhook_id: str,
    data: WebhookUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a webhook."""
    webhook = db.query(Webhook).filter(Webhook.id == webhook_id).first()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(webhook, field, value)
    db.commit()
    db.refresh(webhook)
    return webhook

@router.delete("/webhooks/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_webhook(
    webhook_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a webhook."""
    webhook = db.query(Webhook).filter(Webhook.id == webhook_id).first()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    db.delete(webhook)
    db.commit()

@router.get("/webhooks/{webhook_id}/logs")
def get_webhook_logs(
    webhook_id: str,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get webhook delivery logs."""
    logs = db.query(WebhookLog).filter(
        WebhookLog.webhook_id == webhook_id
    ).order_by(WebhookLog.created_at.desc()).limit(limit).all()
    return logs

@router.post("/webhooks/{webhook_id}/test")
async def test_webhook(
    webhook_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Test a webhook with sample payload."""
    webhook = db.query(Webhook).filter(Webhook.id == webhook_id).first()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    test_payload = {
        "event": "test",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {"message": "This is a test webhook delivery"}
    }
    
    await trigger_webhook(webhook, "test", test_payload, db)
    return {"message": "Test webhook sent", "url": webhook.url}

# Integration Endpoints
@router.get("/integrations", response_model=List[IntegrationResponse])
def list_integrations(
    type_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all integrations."""
    query = db.query(Integration)
    if type_filter:
        query = query.filter(Integration.type == type_filter)
    return query.all()

@router.post("/integrations", response_model=IntegrationResponse, status_code=status.HTTP_201_CREATED)
def create_integration(
    data: IntegrationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new integration."""
    integration = Integration(
        name=data.name,
        type=data.type,
        provider=data.provider,
        config=data.config,
        user_id=current_user.id
    )
    db.add(integration)
    db.commit()
    db.refresh(integration)
    return integration

@router.delete("/integrations/{integration_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_integration(
    integration_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete an integration."""
    integration = db.query(Integration).filter(Integration.id == integration_id).first()
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    db.delete(integration)
    db.commit()
