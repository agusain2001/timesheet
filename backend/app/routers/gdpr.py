"""
GDPR Compliance API Router.
Exposes endpoints for data export, deletion, and consent management.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.utils import get_current_active_user
from app.services.gdpr_service import GDPRService


router = APIRouter(prefix="/gdpr", tags=["GDPR Compliance"])


class ConsentUpdate(BaseModel):
    marketing_emails: Optional[bool] = None
    analytics_tracking: Optional[bool] = None


class DeleteDataRequest(BaseModel):
    confirm: bool = False
    keep_anonymized: bool = True


@router.get("/my-data")
async def export_my_data(
    format: str = "json",
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Export all personal data (GDPR Article 20 - Right to data portability).
    Returns all data associated with the authenticated user.
    """
    service = GDPRService(db)
    result = await service.export_user_data(current_user.id, format=format)
    
    if format == "zip":
        return {
            "download_url": result.get("download_url"),
            "expires_in": result.get("expires_in", 3600),
            "message": "Your data export is ready for download"
        }
    
    return result


@router.delete("/my-data")
async def delete_my_data(
    request: DeleteDataRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Delete all personal data (GDPR Article 17 - Right to erasure).
    This action is irreversible.
    """
    service = GDPRService(db)
    result = await service.delete_user_data(
        user_id=current_user.id,
        confirm=request.confirm,
        keep_anonymized=request.keep_anonymized
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result


@router.get("/consent")
async def get_consent_status(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get current consent settings."""
    service = GDPRService(db)
    return service.get_consent_status(current_user.id)


@router.put("/consent")
async def update_consent(
    consent: ConsentUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Update consent preferences."""
    service = GDPRService(db)
    return service.update_consent(
        user_id=current_user.id,
        marketing_emails=consent.marketing_emails,
        analytics_tracking=consent.analytics_tracking
    )


@router.get("/access-log")
async def get_data_access_log(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get log of data access events for the user."""
    service = GDPRService(db)
    return service.get_data_access_log(current_user.id, limit=limit)
