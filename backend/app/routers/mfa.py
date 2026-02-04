"""MFA (Multi-Factor Authentication) router."""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import pyotp
import secrets
import base64

from app.database import get_db
from app.models import User
from app.models.templates import MFASettings
from app.utils import get_current_active_user

router = APIRouter()


class MFASetupResponse(BaseModel):
    secret: str
    qr_code_url: str
    backup_codes: list


class MFAVerifyRequest(BaseModel):
    code: str


class MFAStatusResponse(BaseModel):
    is_enabled: bool
    verified_at: Optional[str] = None


@router.get("/status", response_model=MFAStatusResponse)
def get_mfa_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current MFA status for the user."""
    mfa = db.query(MFASettings).filter(MFASettings.user_id == current_user.id).first()
    
    if not mfa:
        return MFAStatusResponse(is_enabled=False)
    
    return MFAStatusResponse(
        is_enabled=mfa.is_enabled == "true",
        verified_at=str(mfa.verified_at) if mfa.verified_at else None
    )


@router.post("/setup", response_model=MFASetupResponse)
def setup_mfa(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Initialize MFA setup - generates secret and QR code."""
    # Check if already set up
    existing = db.query(MFASettings).filter(MFASettings.user_id == current_user.id).first()
    if existing and existing.is_enabled == "true":
        raise HTTPException(status_code=400, detail="MFA is already enabled")
    
    # Generate new secret
    secret = pyotp.random_base32()
    
    # Generate backup codes
    backup_codes = [secrets.token_hex(4).upper() for _ in range(10)]
    
    # Create or update MFA settings
    if existing:
        existing.secret_key = secret
        existing.backup_codes = backup_codes
        existing.is_enabled = "false"
    else:
        mfa = MFASettings(
            user_id=current_user.id,
            secret_key=secret,
            backup_codes=backup_codes,
            is_enabled="false"
        )
        db.add(mfa)
    
    db.commit()
    
    # Generate provisioning URI for QR code
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=current_user.email,
        issuer_name="TimeSheet"
    )
    
    return MFASetupResponse(
        secret=secret,
        qr_code_url=provisioning_uri,
        backup_codes=backup_codes
    )


@router.post("/verify")
def verify_mfa_setup(
    verify_data: MFAVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Verify MFA code and enable MFA."""
    mfa = db.query(MFASettings).filter(MFASettings.user_id == current_user.id).first()
    if not mfa:
        raise HTTPException(status_code=400, detail="MFA not set up")
    
    if mfa.is_enabled == "true":
        raise HTTPException(status_code=400, detail="MFA is already enabled")
    
    # Verify the code
    totp = pyotp.TOTP(mfa.secret_key)
    if not totp.verify(verify_data.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Enable MFA
    mfa.is_enabled = "true"
    mfa.verified_at = datetime.utcnow()
    db.commit()
    
    return {"message": "MFA enabled successfully"}


@router.post("/validate")
def validate_mfa_code(
    verify_data: MFAVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Validate an MFA code (for login flow)."""
    mfa = db.query(MFASettings).filter(MFASettings.user_id == current_user.id).first()
    if not mfa or mfa.is_enabled != "true":
        return {"valid": True, "mfa_required": False}
    
    # Check TOTP code
    totp = pyotp.TOTP(mfa.secret_key)
    if totp.verify(verify_data.code, valid_window=1):
        mfa.last_used_at = datetime.utcnow()
        db.commit()
        return {"valid": True}
    
    # Check backup codes
    if verify_data.code.upper() in mfa.backup_codes:
        # Remove used backup code
        mfa.backup_codes.remove(verify_data.code.upper())
        mfa.last_used_at = datetime.utcnow()
        db.commit()
        return {"valid": True, "backup_code_used": True}
    
    return {"valid": False}


@router.post("/disable")
def disable_mfa(
    verify_data: MFAVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Disable MFA (requires current code for security)."""
    mfa = db.query(MFASettings).filter(MFASettings.user_id == current_user.id).first()
    if not mfa or mfa.is_enabled != "true":
        raise HTTPException(status_code=400, detail="MFA is not enabled")
    
    # Verify the code first
    totp = pyotp.TOTP(mfa.secret_key)
    if not totp.verify(verify_data.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Disable MFA
    mfa.is_enabled = "false"
    mfa.secret_key = None
    mfa.backup_codes = []
    db.commit()
    
    return {"message": "MFA disabled successfully"}


@router.get("/backup-codes")
def get_backup_codes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get remaining backup codes."""
    mfa = db.query(MFASettings).filter(MFASettings.user_id == current_user.id).first()
    if not mfa or mfa.is_enabled != "true":
        raise HTTPException(status_code=400, detail="MFA is not enabled")
    
    return {
        "backup_codes": mfa.backup_codes,
        "remaining": len(mfa.backup_codes)
    }


@router.post("/regenerate-backup-codes")
def regenerate_backup_codes(
    verify_data: MFAVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Regenerate backup codes (requires current code)."""
    mfa = db.query(MFASettings).filter(MFASettings.user_id == current_user.id).first()
    if not mfa or mfa.is_enabled != "true":
        raise HTTPException(status_code=400, detail="MFA is not enabled")
    
    # Verify the code
    totp = pyotp.TOTP(mfa.secret_key)
    if not totp.verify(verify_data.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Generate new backup codes
    new_codes = [secrets.token_hex(4).upper() for _ in range(10)]
    mfa.backup_codes = new_codes
    db.commit()
    
    return {"backup_codes": new_codes}
