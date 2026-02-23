from datetime import timedelta
from typing import Optional
import urllib.parse
import httpx
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import (
    UserCreate, UserResponse, Token, LoginRequest,
    RegisterRequest, OAuthCallbackResponse
)
from app.utils import verify_password, get_password_hash, create_access_token
from app.config import get_settings

router = APIRouter()
settings = get_settings()


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

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_data: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user and return an access token immediately."""
    if user_data.password != user_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match",
        )

    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    db_user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role="employee",
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    token = _create_token_for_user(db_user)
    return {"access_token": token, "token_type": "bearer"}


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

    return {"access_token": _create_token_for_user(user), "token_type": "bearer"}


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
        f"?token={access_token}&is_new={str(is_new).lower()}"
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
        f"?token={access_token}&is_new={str(is_new).lower()}"
    )
    return RedirectResponse(url=redirect_url)
