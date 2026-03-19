"""Settings router - Profile, Security, Notifications, Privacy."""
import re
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request, File, UploadFile
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
    session_id: str
    device_name: str
    location: str
    last_active: str
    is_current: bool = False


class SecurityResponse(BaseModel):
    mfa_enabled: bool
    mfa_configured: bool
    active_sessions: List[DeviceSession]


class LogoutDeviceRequest(BaseModel):
    session_id: str


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
# Helpers
# ============================================================

def _get_user_settings(user: User) -> dict:
    """Helper to get user.settings ensuring it is a dict."""
    settings = user.settings or {}
    if isinstance(settings, str):
        import json
        try:
            settings = json.loads(settings)
        except Exception:
            settings = {}
    return settings


def _validate_password_strength(password: str) -> None:
    """Validate password meets minimum security requirements."""
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
    if not re.search(r'[A-Z]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter")
    if not re.search(r'[a-z]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter")
    if not re.search(r'[0-9]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one number")


def _get_profile_response(user: User) -> ProfileResponse:
    """Build a ProfileResponse from a User object."""
    settings = _get_user_settings(user)
    dept_name = user.department.name if user.department else None
    return ProfileResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        avatar_url=user.avatar_url,
        role=user.role,
        position=user.position,
        bio=user.bio,
        department=dept_name,
        employee_id_display=settings.get("employee_id_display", str(user.id)[:8].upper()),
        emergency_contact_name=settings.get("emergency_contact_name"),
        emergency_contact_no=settings.get("emergency_contact_no"),
        city=settings.get("city"),
        pincode=settings.get("pincode"),
        tax_address=settings.get("tax_address"),
        updated_at=str(user.updated_at) if user.updated_at else None,
    )


def _get_notification_response(user: User, db: Session) -> NotificationPrefsResponse:
    """Build notification prefs response from user settings."""
    ts_prefs = _get_user_settings(user).get("timesheet_notifications", {})
    prefs_row = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == user.id
    ).first()
    return NotificationPrefsResponse(
        daily_submission_reminder=ts_prefs.get("daily_submission_reminder", False),
        weekly_submission_reminder=ts_prefs.get("weekly_submission_reminder", False),
        timesheet_approved=ts_prefs.get("timesheet_approved", True),
        timesheet_rejected=ts_prefs.get("timesheet_rejected", True),
        manager_comment_alerts=ts_prefs.get("manager_comment_alerts", True),
        weekly_summary_email=prefs_row.weekly_digest if prefs_row else ts_prefs.get("weekly_summary_email", False),
        security_alerts=ts_prefs.get("security_alerts", True),
    )


# ============================================================
# Profile Endpoints
# ============================================================

@router.get("/profile", response_model=ProfileResponse)
def get_settings_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's profile for settings page."""
    return _get_profile_response(current_user)


@router.put("/profile", response_model=ProfileResponse)
def update_settings_profile(
    data: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update current user's profile."""
    if data.full_name is not None:
        current_user.full_name = data.full_name.strip()
    if data.phone is not None:
        current_user.phone = data.phone.strip()
    if data.bio is not None:
        current_user.bio = data.bio.strip()

    # Extended fields stored in settings JSON
    import copy
    settings_copy = copy.deepcopy(_get_user_settings(current_user))

    extended_fields = [
        "employee_id_display", "emergency_contact_name",
        "emergency_contact_no", "city", "pincode", "tax_address"
    ]
    update_dict = data.model_dump(exclude_unset=True)
    for field in extended_fields:
        if field in update_dict:
            settings_copy[field] = update_dict[field]

    current_user.settings = settings_copy
    db.commit()
    db.refresh(current_user)
    return _get_profile_response(current_user)


@router.post("/profile/avatar", response_model=ProfileResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Upload user avatar."""

    from pathlib import Path
    import uuid

    uploads_dir = Path("uploads/avatars")
    uploads_dir.mkdir(parents=True, exist_ok=True)

    ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    MIME_TO_EXT = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/webp": ".webp",
    }

    ext = ""
    if file.filename:
        ext = Path(file.filename).suffix.lower()

    # Fall back to content_type if extension is missing or not recognized
    if ext not in ALLOWED_EXTS:
        ext = MIME_TO_EXT.get((file.content_type or "").lower(), "")

    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail=f"Unsupported image format. Got filename={file.filename!r}, content_type={file.content_type!r}")

    unique_id = str(uuid.uuid4())[:8]
    filename = f"user_{current_user.id}_{unique_id}{ext}"
    file_path = uploads_dir / filename
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
        
    current_user.avatar_url = f"/api/uploads/avatars/{filename}"
    db.commit()
    db.refresh(current_user)
    
    return _get_profile_response(current_user)

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
    mfa_configured = mfa is not None
    mfa_enabled = bool(mfa and mfa.is_enabled == "true")

    # Build sessions from settings JSON
    settings = _get_user_settings(current_user)
    raw_sessions = settings.get("active_sessions", [])

    # Ensure there's always at least one "current" session entry
    if not raw_sessions:
        import uuid as _uuid
        raw_sessions = [{
            "session_id": str(_uuid.uuid4()),
            "device_name": "Current Browser",
            "location": "Unknown",
            "last_active": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
            "is_current": True,
        }]

    sessions = [DeviceSession(**s) for s in raw_sessions]
    return SecurityResponse(
        mfa_enabled=mfa_enabled,
        mfa_configured=mfa_configured,
        active_sessions=sessions
    )


@router.put("/security/password")
def change_password(
    data: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Change user password with validation."""
    # Match check
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match")

    # Verify current password
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    # Same password check
    if data.current_password == data.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from current password")

    # Strength validation
    _validate_password_strength(data.new_password)

    current_user.password_hash = get_password_hash(data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


@router.post("/security/logout-device")
def logout_device(
    data: LogoutDeviceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Remove a device/session from active sessions list by session_id."""
    import copy
    settings_copy = copy.deepcopy(_get_user_settings(current_user))
    sessions = settings_copy.get("active_sessions", [])
    updated = [s for s in sessions if s.get("session_id") != data.session_id]
    settings_copy["active_sessions"] = updated
    current_user.settings = settings_copy
    db.commit()
    return {"message": "Session logged out successfully"}


@router.put("/security/mfa")
def toggle_mfa(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Toggle MFA on/off. Only works if MFA is already configured."""
    mfa = db.query(MFASettings).filter(MFASettings.user_id == current_user.id).first()
    if not mfa:
        raise HTTPException(
            status_code=400,
            detail="MFA not configured. Please set up MFA first."
        )
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
    return _get_notification_response(current_user, db)


@router.put("/notifications", response_model=NotificationPrefsResponse)
def update_notification_preferences(
    data: NotificationPrefsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update notification preferences."""
    import copy
    settings_copy = copy.deepcopy(_get_user_settings(current_user))
    existing = settings_copy.get("timesheet_notifications", {})
    update_dict = data.model_dump(exclude_unset=True)
    existing.update(update_dict)
    settings_copy["timesheet_notifications"] = existing
    current_user.settings = settings_copy

    # Sync weekly digest to NotificationPreference table if present
    if "weekly_summary_email" in update_dict:
        prefs = db.query(NotificationPreference).filter(
            NotificationPreference.user_id == current_user.id
        ).first()
        if prefs:
            prefs.weekly_digest = update_dict["weekly_summary_email"]

    db.commit()
    db.refresh(current_user)
    return _get_notification_response(current_user, db)


# ============================================================
# Privacy Endpoints
# ============================================================

@router.get("/privacy", response_model=PrivacyResponse)
def get_privacy_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get privacy settings."""
    prefs = _get_user_settings(current_user).get("privacy", {})
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
    import copy
    settings_copy = copy.deepcopy(_get_user_settings(current_user))
    existing = settings_copy.get("privacy", {})
    update_dict = data.model_dump(exclude_unset=True)
    existing.update(update_dict)
    settings_copy["privacy"] = existing
    current_user.settings = settings_copy

    db.commit()
    db.refresh(current_user)

    prefs = _get_user_settings(current_user).get("privacy", {})
    return PrivacyResponse(
        show_online_status=prefs.get("show_online_status", True),
        display_last_active_time=prefs.get("display_last_active_time", True),
    )
