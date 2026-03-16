"""Organizations API router — full CRUD for multi-tenancy."""
import uuid
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app.models import User
from app.models.organization import Organization
from app.utils import get_current_active_user
from app.utils.role_guards import is_admin, is_super_admin
from app.utils.tenant import get_org_id

router = APIRouter()


# ─── Schemas ─────────────────────────────────────────────────────────────────

class OrganizationCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    tax_id: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    tax_id: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    max_users: Optional[int] = None
    max_projects: Optional[int] = None
    subscription_plan: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None


class OrganizationResponse(BaseModel):
    id: str
    name: str
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    tax_id: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    subscription_plan: str
    max_users: int
    max_projects: int
    is_verified: bool
    is_active: bool
    created_at: datetime
    user_count: int = 0
    project_count: int = 0

    class Config:
        from_attributes = True


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _build_response(org: Organization, db: Session) -> dict:
    from app.models import User as UserModel, Project
    user_count = db.query(UserModel).filter(UserModel.organization_id == org.id).count()
    project_count = db.query(Project).filter(Project.organization_id == org.id).count()
    return {
        "id": org.id,
        "name": org.name,
        "slug": org.slug,
        "logo_url": org.logo_url,
        "tax_id": org.tax_id,
        "address": org.address,
        "city": org.city,
        "state": org.state,
        "country": org.country,
        "zip_code": org.zip_code,
        "phone": org.phone,
        "email": org.email,
        "website": org.website,
        "industry": org.industry,
        "subscription_plan": org.subscription_plan,
        "max_users": org.max_users,
        "max_projects": org.max_projects,
        "is_verified": org.is_verified,
        "is_active": org.is_active,
        "created_at": org.created_at,
        "user_count": user_count,
        "project_count": project_count,
    }


def _generate_slug(name: str) -> str:
    import re
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_-]+", "-", slug)
    slug = slug.strip("-")
    return slug


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/public", response_model=List[dict])
def list_organizations_public(db: Session = Depends(get_db)):
    """Public endpoint — returns minimal org list for registration dropdown. No auth required."""
    orgs = (
        db.query(Organization)
        .filter(Organization.is_active == True, Organization.is_verified == True)
        .order_by(Organization.name)
        .all()
    )
    return [{"id": o.id, "name": o.name, "logo_url": o.logo_url, "industry": o.industry} for o in orgs]


@router.get("/{org_id}/stats")
def get_organization_stats(
    org_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get detailed stats for an org — used by Super Admin dashboard cards."""
    from app.utils.tenant import is_super_admin as _is_super_admin
    from app.models import User as UserModel, Project, Task
    if not _is_super_admin(current_user) and current_user.organization_id != org_id:
        raise HTTPException(status_code=403, detail="Access denied")

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    user_count = db.query(UserModel).filter(UserModel.organization_id == org_id).count()
    project_count = db.query(Project).filter(Project.organization_id == org_id).count()
    active_project_count = db.query(Project).filter(
        Project.organization_id == org_id, Project.status == "active"
    ).count()
    task_count = db.query(Task).filter(Task.organization_id == org_id).count()
    pending_user_count = db.query(UserModel).filter(
        UserModel.organization_id == org_id, UserModel.user_status == "pending"
    ).count()

    return {
        "id": org.id,
        "name": org.name,
        "slug": org.slug,
        "logo_url": org.logo_url,
        "industry": org.industry,
        "country": org.country,
        "subscription_plan": org.subscription_plan,
        "max_users": org.max_users,
        "max_projects": org.max_projects,
        "is_active": org.is_active,
        "is_verified": org.is_verified,
        "created_at": org.created_at,
        "stats": {
            "user_count": user_count,
            "project_count": project_count,
            "active_project_count": active_project_count,
            "task_count": task_count,
            "pending_user_count": pending_user_count,
        },
    }


@router.get("", response_model=List[OrganizationResponse])
def list_organizations(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List organizations — super admins see all, others see only their own."""
    from app.utils.tenant import is_super_admin as _is_super_admin
    if _is_super_admin(current_user):
        query = db.query(Organization).filter(Organization.is_active == True)
        if search:
            query = query.filter(Organization.name.ilike(f"%{search}%"))
        orgs = query.offset(skip).limit(limit).all()
        return [_build_response(o, db) for o in orgs]
    else:
        # Regular users: return only their own org
        org_id = get_org_id(current_user)
        if not org_id:
            return []
        org = db.query(Organization).filter(Organization.id == org_id).first()
        return [_build_response(org, db)] if org else []


@router.post("", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
def create_organization(
    data: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new organization. Anyone can create one (they become admin)."""
    slug = data.slug or _generate_slug(data.name)

    # Ensure slug uniqueness
    existing_slug = db.query(Organization).filter(Organization.slug == slug).first()
    if existing_slug:
        slug = f"{slug}-{str(uuid.uuid4())[:8]}"

    org = Organization(
        id=str(uuid.uuid4()),
        name=data.name,
        slug=slug,
        logo_url=data.logo_url,
        tax_id=data.tax_id,
        address=data.address,
        city=data.city,
        state=data.state,
        country=data.country,
        zip_code=data.zip_code,
        phone=data.phone,
        email=data.email,
        website=data.website,
        industry=data.industry,
    )
    db.add(org)
    db.commit()
    db.refresh(org)

    # Automatically assign creator to this organization as admin
    current_user.organization_id = org.id
    current_user.role = "org_admin"
    current_user.user_status = "approved"  # org creator is auto-approved
    current_user.email_verified = True
    db.commit()

    return _build_response(org, db)


@router.get("/my", response_model=OrganizationResponse)
def get_my_organization(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get the current user's organization."""
    org_id = get_org_id(current_user)
    if not org_id:
        raise HTTPException(status_code=404, detail="You are not part of any organization")
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return _build_response(org, db)


@router.get("/{org_id}", response_model=OrganizationResponse)
def get_organization(
    org_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get organization by ID. Users can only get their own unless super admin."""
    from app.utils.tenant import is_super_admin as _is_super_admin
    if not _is_super_admin(current_user) and current_user.organization_id != org_id:
        raise HTTPException(status_code=403, detail="Access denied")
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return _build_response(org, db)


@router.put("/{org_id}", response_model=OrganizationResponse)
def update_organization(
    org_id: str,
    data: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update organization. Only org admin or super admin."""
    from app.utils.tenant import is_super_admin as _is_super_admin
    if not _is_super_admin(current_user):
        if current_user.organization_id != org_id or not is_admin(current_user):
            raise HTTPException(status_code=403, detail="Admin access required")

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(org, field, value)
    org.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(org)
    return _build_response(org, db)


@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_organization(
    org_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Soft-delete an organization. Super admin only."""
    from app.utils.tenant import is_super_admin as _is_super_admin
    if not _is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Super admin access required")
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    org.is_active = False
    db.commit()
    return None
