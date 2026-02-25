"""Settings router - Profile, Security, Notifications, Privacy."""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import User, NotificationPreference, MFASettings
from app.utils import get_current_active_user, get_password_hash, verify_password

router = APIRouter()


# ============================================================
# Schemas
# ============================================================

class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    employee_id_display: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_no: Optional[str] = None
    bio: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    tax_address: Optional[str] = None


class ProfileResponse(BaseModel):
    id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    position: Optional[str] = None
    bio: Optional[str] = None
    department: Optional[str] = None
    employee_id_display: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_no: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    tax_address: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str


class DeviceSession(BaseModel):
    device_name: str
    location: str
    last_active: str
    is_current: bool = False


class SecurityResponse(BaseModel):
    mfa_enabled: bool
    active_sessions: List[DeviceSession]


class LogoutDeviceRequest(BaseModel):
    device_name: str


class NotificationPrefsRequest(BaseModel):
    daily_submission_reminder: Optional[bool] = None
    weekly_submission_reminder: Optional[bool] = None
    timesheet_approved: Optional[bool] = None
    timesheet_rejected: Optional[bool] = None
    manager_comment_alerts: Optional[bool] = None
    weekly_summary_email: Optional[bool] = None
    security_alerts: Optional[bool] = None


class NotificationPrefsResponse(BaseModel):
    daily_submission_reminder: bool
    weekly_submission_reminder: bool
    timesheet_approved: bool
    timesheet_rejected: bool
    manager_comment_alerts: bool
    weekly_summary_email: bool
    security_alerts: bool


class PrivacyRequest(BaseModel):
    show_online_status: Optional[bool] = None
    display_last_active_time: Optional[bool] = None


class PrivacyResponse(BaseModel):
    show_online_status: bool
    display_last_active_time: bool


# ============================================================
# Profile Endpoints
# ============================================================

@router.get("/profile", response_model=ProfileResponse)
def get_settings_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's profile for settings page."""
    settings = current_user.settings or {}
    dept_name = current_user.department.name if current_user.department else None

    return ProfileResponse(
        id=current_user.id,
        full_name=current_user.full_name,
        email=current_user.email,
        phone=current_user.phone,
        avatar_url=current_user.avatar_url,
        role=current_user.role,
        position=current_user.position,
        bio=current_user.bio,
        department=dept_name,
        employee_id_display=settings.get("employee_id_display", str(current_user.id)[:8].upper()),
        emergency_contact_name=settings.get("emergency_contact_name"),
        emergency_contact_no=settings.get("emergency_contact_no"),
        city=settings.get("city"),
        pincode=settings.get("pincode"),
        tax_address=settings.get("tax_address"),
        updated_at=str(current_user.updated_at) if current_user.updated_at else None,
    )


@router.put("/profile", response_model=ProfileResponse)
def update_settings_profile(
    data: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update current user's profile."""
    if data.full_name is not None:
        current_user.full_name = data.full_name
    if data.phone is not None:
        current_user.phone = data.phone
    if data.bio is not None:
        current_user.bio = data.bio

    # Extended fields stored in settings JSON
    if not current_user.settings:
        current_user.settings = {}

    extended_fields = [
        "employee_id_display", "emergency_contact_name",
        "emergency_contact_no", "city", "pincode", "tax_address"
    ]
    update_dict = data.model_dump(exclude_unset=True)
    for field in extended_fields:
        if field in update_dict:
            current_user.settings[field] = update_dict[field]

    db.commit()
    db.refresh(current_user)

    settings = current_user.settings or {}
    dept_name = current_user.department.name if current_user.department else None

    return ProfileResponse(
        id=current_user.id,
        full_name=current_user.full_name,
        email=current_user.email,
        phone=current_user.phone,
        avatar_url=current_user.avatar_url,
        role=current_user.role,
        position=current_user.position,
        bio=current_user.bio,
        department=dept_name,
        employee_id_display=settings.get("employee_id_display", str(current_user.id)[:8].upper()),
        emergency_contact_name=settings.get("emergency_contact_name"),
        emergency_contact_no=settings.get("emergency_contact_no"),
        city=settings.get("city"),
        pincode=settings.get("pincode"),
        tax_address=settings.get("tax_address"),
        updated_at=str(current_user.updated_at) if current_user.updated_at else None,
    )


# ============================================================
# Security Endpoints
# ============================================================

@router.get("/security", response_model=SecurityResponse)
def get_security_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get security settings (MFA status + active sessions)."""
    mfa = db.query(MFASettings).filter(MFASettings.user_id == current_user.id).first()
    mfa_enabled = bool(mfa and mfa.is_enabled == "true")

    # Build sessions from settings JSON
    settings = current_user.settings or {}
    raw_sessions = settings.get("active_sessions", [])

    # Ensure there's always at least one "current" session entry
    if not raw_sessions:
        raw_sessions = [{
            "device_name": "Current Browser",
            "location": "Unknown",
            "last_active": datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
            "is_current": True,
        }]

    sessions = [DeviceSession(**s) for s in raw_sessions]

    return SecurityResponse(mfa_enabled=mfa_enabled, active_sessions=sessions)


@router.put("/security/password")
def change_password(
    data: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Change user password."""
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match")

    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current_user.password_hash = get_password_hash(data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


@router.post("/security/logout-device")
def logout_device(
    data: LogoutDeviceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Remove a device/session from active sessions list."""
    if not current_user.settings:
        current_user.settings = {}

    sessions = current_user.settings.get("active_sessions", [])
    updated = [s for s in sessions if s.get("device_name") != data.device_name]
    current_user.settings["active_sessions"] = updated
    db.commit()
    return {"message": f"Device '{data.device_name}' logged out"}


@router.put("/security/mfa")
def toggle_mfa(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Toggle MFA on/off."""
    mfa = db.query(MFASettings).filter(MFASettings.user_id == current_user.id).first()
    if not mfa:
        raise HTTPException(status_code=400, detail="MFA not configured. Please set up MFA first via /api/mfa/setup")
    mfa.is_enabled = "false" if mfa.is_enabled == "true" else "true"
    db.commit()
    return {"mfa_enabled": mfa.is_enabled == "true"}


# ============================================================
# Notification Preference Endpoints
# ============================================================

@router.get("/notifications", response_model=NotificationPrefsResponse)
def get_notification_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get notification preferences for the settings page."""
    prefs = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).first()

    # Fall back to defaults
    settings = current_user.settings or {}
    ts_prefs = settings.get("timesheet_notifications", {})

    return NotificationPrefsResponse(
        daily_submission_reminder=ts_prefs.get("daily_submission_reminder", False),
        weekly_submission_reminder=ts_prefs.get("weekly_submission_reminder", False),
        timesheet_approved=ts_prefs.get("timesheet_approved", False),
        timesheet_rejected=ts_prefs.get("timesheet_rejected", False),
        manager_comment_alerts=ts_prefs.get("manager_comment_alerts", False),
        weekly_summary_email=prefs.weekly_digest if prefs else ts_prefs.get("weekly_summary_email", False),
        security_alerts=ts_prefs.get("security_alerts", False),
    )


@router.put("/notifications", response_model=NotificationPrefsResponse)
def update_notification_preferences(
    data: NotificationPrefsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update notification preferences."""
    if not current_user.settings:
        current_user.settings = {}

    existing = current_user.settings.get("timesheet_notifications", {})
    update_dict = data.model_dump(exclude_unset=True)
    existing.update(update_dict)
    current_user.settings["timesheet_notifications"] = existing

    # Sync weekly digest to NotificationPreference table if present
    if "weekly_summary_email" in update_dict:
        prefs = db.query(NotificationPreference).filter(
            NotificationPreference.user_id == current_user.id
        ).first()
        if prefs:
            prefs.weekly_digest = update_dict["weekly_summary_email"]

    db.commit()
    db.refresh(current_user)

    ts_prefs = current_user.settings.get("timesheet_notifications", {})
    prefs_row = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).first()

    return NotificationPrefsResponse(
        daily_submission_reminder=ts_prefs.get("daily_submission_reminder", False),
        weekly_submission_reminder=ts_prefs.get("weekly_submission_reminder", False),
        timesheet_approved=ts_prefs.get("timesheet_approved", False),
        timesheet_rejected=ts_prefs.get("timesheet_rejected", False),
        manager_comment_alerts=ts_prefs.get("manager_comment_alerts", False),
        weekly_summary_email=prefs_row.weekly_digest if prefs_row else ts_prefs.get("weekly_summary_email", False),
        security_alerts=ts_prefs.get("security_alerts", False),
    )


# ============================================================
# Privacy Endpoints
# ============================================================

@router.get("/privacy", response_model=PrivacyResponse)
def get_privacy_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get privacy settings."""
    prefs = (current_user.settings or {}).get("privacy", {})
    return PrivacyResponse(
        show_online_status=prefs.get("show_online_status", True),
        display_last_active_time=prefs.get("display_last_active_time", True),
    )


@router.put("/privacy", response_model=PrivacyResponse)
def update_privacy_settings(
    data: PrivacyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update privacy settings."""
    if not current_user.settings:
        current_user.settings = {}

    existing = current_user.settings.get("privacy", {})
    update_dict = data.model_dump(exclude_unset=True)
    existing.update(update_dict)
    current_user.settings["privacy"] = existing

    db.commit()
    db.refresh(current_user)

    prefs = (current_user.settings or {}).get("privacy", {})
    return PrivacyResponse(
        show_online_status=prefs.get("show_online_status", True),
        display_last_active_time=prefs.get("display_last_active_time", True),
    )
