"""
Google Calendar Integration API Router.
Handles OAuth flow and calendar sync operations.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.utils import get_current_active_user
from app.services.google_calendar_service import GoogleCalendarService


router = APIRouter(prefix="/google-calendar", tags=["Google Calendar"])


class SyncRequest(BaseModel):
    calendar_id: str = "primary"
    project_id: Optional[str] = None


# ==================== OAuth Flow ====================

@router.get("/auth")
async def initiate_google_auth(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Start Google Calendar OAuth flow.
    Returns authorization URL for user to grant access.
    """
    service = GoogleCalendarService(db)
    result = service.get_authorization_url(str(current_user.id))
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return {
        "authorization_url": result["authorization_url"],
        "message": "Redirect user to authorization_url to complete OAuth"
    }


@router.get("/callback")
async def google_oauth_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db)
):
    """
    Handle Google OAuth callback.
    Called by Google after user grants permission.
    """
    # Extract user_id from state
    user_id = state.split(":")[0] if ":" in state else state
    
    service = GoogleCalendarService(db)
    result = service.handle_oauth_callback(code, state, user_id)
    
    if result.get("success"):
        # Redirect to success page
        return RedirectResponse(url="/settings/integrations?google_calendar=connected")
    else:
        return RedirectResponse(url=f"/settings/integrations?error={result.get('error')}")


@router.delete("/disconnect")
async def disconnect_google_calendar(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Disconnect Google Calendar integration."""
    service = GoogleCalendarService(db)
    result = service.disconnect(str(current_user.id))
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result


# ==================== Calendar Operations ====================

@router.get("/calendars")
async def list_calendars(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """List user's Google calendars."""
    service = GoogleCalendarService(db)
    calendars = service.list_calendars(str(current_user.id))
    return {"calendars": calendars}


@router.get("/events")
async def get_events(
    calendar_id: str = "primary",
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    max_results: int = Query(100, le=250),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get calendar events."""
    service = GoogleCalendarService(db)
    events = service.get_events(
        user_id=str(current_user.id),
        calendar_id=calendar_id,
        time_min=start_date,
        time_max=end_date,
        max_results=max_results
    )
    return {"events": events}


# ==================== Sync Operations ====================

@router.post("/sync/task-to-calendar/{task_id}")
async def sync_task_to_calendar(
    task_id: str,
    calendar_id: str = "primary",
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Sync a task to Google Calendar.
    Creates or updates a calendar event for the task.
    """
    service = GoogleCalendarService(db)
    result = await service.sync_task_to_calendar(
        user_id=str(current_user.id),
        task_id=task_id,
        calendar_id=calendar_id
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result


@router.post("/sync/calendar-to-tasks")
async def sync_calendar_to_tasks(
    request: SyncRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Import calendar events as tasks.
    Creates or updates tasks based on calendar events.
    """
    service = GoogleCalendarService(db)
    result = await service.sync_calendar_to_tasks(
        user_id=str(current_user.id),
        calendar_id=request.calendar_id,
        project_id=request.project_id
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result


@router.get("/status")
async def get_integration_status(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get Google Calendar integration status."""
    from app.models.integration import Integration
    
    integration = db.query(Integration).filter(
        Integration.user_id == str(current_user.id),
        Integration.provider == "google_calendar"
    ).first()
    
    if integration and integration.is_active:
        return {
            "connected": True,
            "last_sync": integration.last_sync_at.isoformat() if integration.last_sync_at else None
        }
    
    return {"connected": False}
