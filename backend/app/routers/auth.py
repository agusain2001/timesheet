from datetime import timedelta
from typing import Optional
import urllib.parse
import httpx
import uuid
import re

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import (
    UserCreate, UserResponse, Token, LoginRequest,
    RegisterRequest, OAuthCallbackResponse
)
from app.utils import verify_password, get_password_hash, create_access_token, get_current_active_user
from app.config import get_settings

router = APIRouter()
settings = get_settings()
limiter = Limiter(key_func=get_remote_address)


def _create_token_for_user(user: User) -> str:
    """Helper: create access token for a user."""
    expires = timedelta(minutes=settings.access_token_expire_minutes)
    return create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role},
        expires_delta=expires,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Email / Password Auth
# ─────────────────────────────────────────────────────────────────────────────

def _validate_password_strength(password: str) -> None:
    """Validate password meets minimum security requirements."""
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
    if not re.search(r'[A-Z]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter")
    if not re.search(r'[a-z]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter")
    if not re.search(r'[0-9]', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one digit")


def _check_mfa_required(user: User, db) -> bool:
    """Check if user has MFA enabled."""
    try:
        from app.models.templates import MFASettings
        mfa = db.query(MFASettings).filter(MFASettings.user_id == user.id).first()
        return mfa is not None and mfa.is_enabled == "true"
    except Exception:
        return False


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user_data: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user. User is created with pending status — must be approved by org admin."""
    if user_data.password != user_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match",
        )

    # Validate password strength
    _validate_password_strength(user_data.password)

    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Generate email verification token
    verification_token = str(uuid.uuid4())

    db_user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role="employee",
        email_verified=False,
        user_status="pending",
        email_verification_token=verification_token,
        organization_id=user_data.organization_id if hasattr(user_data, 'organization_id') else None,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # TODO: Send verification email using email_notifications router
    # send_verification_email(db_user.email, verification_token)

    return {
        "message": "Registration successful. Please verify your email and wait for your organization admin to approve your account.",
        "user_id": db_user.id,
        "email": db_user.email,
        "status": "pending"
    }


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login with OAuth2 form and get access token."""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    # Check email verification (admins seeded directly in DB bypass this)
    _admin_roles = {"admin", "system_admin", "org_admin"}
    if not user.email_verified and user.role not in _admin_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before logging in",
        )

    # Check user approval status (None treated as approved for legacy accounts)
    _status = user.user_status or "approved"
    if _status == "pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending approval by your organization admin",
        )
    if _status in ("rejected", "suspended"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your account has been {_status}. Please contact your organization admin",
        )

    # Check MFA
    if _check_mfa_required(user, db):
        return {"access_token": "", "token_type": "bearer", "mfa_required": True, "user_id": str(user.id)}

    return {"access_token": _create_token_for_user(user), "token_type": "bearer"}


@router.post("/login/json", response_model=Token)
def login_json(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Login with JSON body and get access token."""
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    # Check email verification (admins seeded directly in DB bypass this)
    _admin_roles = {"admin", "system_admin", "org_admin"}
    if not user.email_verified and user.role not in _admin_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before logging in",
        )

    # Check user approval status (None treated as approved for legacy accounts)
    _status = user.user_status or "approved"
    if _status == "pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending approval by your organization admin",
        )
    if _status in ("rejected", "suspended"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your account has been {_status}. Please contact your organization admin",
        )

    # Check MFA
    if _check_mfa_required(user, db):
        return {"access_token": "", "token_type": "bearer", "mfa_required": True, "user_id": str(user.id)}

    return {"access_token": _create_token_for_user(user), "token_type": "bearer"}


# ─────────────────────────────────────────────────────────────────────────────
# Email Verification
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    """Verify a user's email address using the token sent during registration."""
    user = db.query(User).filter(User.email_verification_token == token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token",
        )
    if user.email_verified:
        return {"message": "Email already verified", "email": user.email}

    user.email_verified = True
    user.email_verification_token = None  # Invalidate the token
    db.commit()

    return {
        "message": "Email verified successfully. Your account is pending admin approval.",
        "email": user.email,
        "user_status": user.user_status,
    }


@router.post("/resend-verification")
def resend_verification(email: str, db: Session = Depends(get_db)):
    """Resend a fresh email verification token."""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return {"message": "If the email exists, a verification link will be sent"}
    if user.email_verified:
        return {"message": "Email is already verified"}

    new_token = str(uuid.uuid4())
    user.email_verification_token = new_token
    db.commit()

    # TODO: Send email with verification link containing new_token
    return {"message": "Verification email resent. Please check your inbox."}


# ─────────────────────────────────────────────────────────────────────────────
# Google OAuth
# ─────────────────────────────────────────────────────────────────────────────

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


@router.get("/google")
def google_oauth_redirect():
    """Redirect user to Google's OAuth consent screen."""
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env",
        )

    callback_uri = f"{settings.oauth_redirect_base_url.rstrip('/')}/api/auth/google/callback"
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": callback_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    }
    url = f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=url)


@router.get("/google/callback")
async def google_oauth_callback(
    code: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Handle Google OAuth callback and return JWT."""
    if error or not code:
        return RedirectResponse(url=f"{settings.oauth_redirect_base_url}/login?error=google_oauth_failed")

    callback_uri = f"{settings.oauth_redirect_base_url.rstrip('/')}/api/auth/google/callback"

    async with httpx.AsyncClient() as client:
        # Exchange code for token
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": callback_uri,
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            return RedirectResponse(url=f"{settings.oauth_redirect_base_url}/login?error=google_token_failed")

        google_token = token_resp.json().get("access_token")

        # Fetch user info
        user_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {google_token}"},
        )
        if user_resp.status_code != 200:
            return RedirectResponse(url=f"{settings.oauth_redirect_base_url}/login?error=google_userinfo_failed")

        google_user = user_resp.json()

    email = google_user.get("email")
    full_name = google_user.get("name", email)
    avatar_url = google_user.get("picture")

    if not email:
        return RedirectResponse(url=f"{settings.oauth_redirect_base_url}/login?error=no_email")

    # Upsert user
    user = db.query(User).filter(User.email == email).first()
    is_new = False
    if not user:
        is_new = True
        user = User(
            email=email,
            full_name=full_name,
            password_hash=get_password_hash(str(uuid.uuid4())),  # random password
            role="employee",
            avatar_url=avatar_url,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = _create_token_for_user(user)
    redirect_url = (
        f"{settings.oauth_redirect_base_url}/login/oauth-callback"
        f"#token={access_token}&is_new={str(is_new).lower()}"
    )
    return RedirectResponse(url=redirect_url)


# ─────────────────────────────────────────────────────────────────────────────
# Microsoft (Outlook) OAuth
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/microsoft")
def microsoft_oauth_redirect():
    """Redirect user to Microsoft's OAuth consent screen."""
    if not settings.microsoft_client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Microsoft OAuth is not configured. Please set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in .env",
        )

    tenant = settings.microsoft_tenant_id
    ms_auth_url = f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize"
    callback_uri = f"{settings.oauth_redirect_base_url.rstrip('/')}/api/auth/microsoft/callback"

    params = {
        "client_id": settings.microsoft_client_id,
        "redirect_uri": callback_uri,
        "response_type": "code",
        "scope": "openid email profile User.Read",
        "response_mode": "query",
    }
    url = f"{ms_auth_url}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=url)


@router.get("/microsoft/callback")
async def microsoft_oauth_callback(
    code: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Handle Microsoft OAuth callback and return JWT."""
    if error or not code:
        return RedirectResponse(url=f"{settings.oauth_redirect_base_url}/login?error=microsoft_oauth_failed")

    tenant = settings.microsoft_tenant_id
    ms_token_url = f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
    callback_uri = f"{settings.oauth_redirect_base_url.rstrip('/')}/api/auth/microsoft/callback"

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            ms_token_url,
            data={
                "code": code,
                "client_id": settings.microsoft_client_id,
                "client_secret": settings.microsoft_client_secret,
                "redirect_uri": callback_uri,
                "grant_type": "authorization_code",
                "scope": "openid email profile User.Read",
            },
        )
        if token_resp.status_code != 200:
            return RedirectResponse(url=f"{settings.oauth_redirect_base_url}/login?error=microsoft_token_failed")

        ms_token = token_resp.json().get("access_token")

        # Fetch Microsoft user profile
        profile_resp = await client.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {ms_token}"},
        )
        if profile_resp.status_code != 200:
            return RedirectResponse(url=f"{settings.oauth_redirect_base_url}/login?error=microsoft_profile_failed")

        ms_user = profile_resp.json()

    email = ms_user.get("mail") or ms_user.get("userPrincipalName")
    full_name = ms_user.get("displayName", email)

    if not email:
        return RedirectResponse(url=f"{settings.oauth_redirect_base_url}/login?error=no_email")

    # Upsert user
    user = db.query(User).filter(User.email == email).first()
    is_new = False
    if not user:
        is_new = True
        user = User(
            email=email,
            full_name=full_name,
            password_hash=get_password_hash(str(uuid.uuid4())),
            role="employee",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = _create_token_for_user(user)
    redirect_url = (
        f"{settings.oauth_redirect_base_url}/login/oauth-callback"
        f"#token={access_token}&is_new={str(is_new).lower()}"
    )
    return RedirectResponse(url=redirect_url)


# ─────────────────────────────────────────────────────────────────────────────
# Token Refresh
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/refresh", response_model=Token)
def refresh_token(
    current_user: User = Depends(get_current_active_user),
):
    """Refresh access token. Requires a valid current token."""
    new_token = _create_token_for_user(current_user)
    return {"access_token": new_token, "token_type": "bearer"}


@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_active_user),
):
    """Get current authenticated user info."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active,
    }
