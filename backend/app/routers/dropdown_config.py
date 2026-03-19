"""Dynamic dropdown configuration router — CRUD for per-org and system-wide dropdown options."""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import User
from app.models.dropdown_config import DropdownConfig
from app.utils.security import get_current_active_user
from app.utils.tenant import is_super_admin, get_org_id

router = APIRouter(prefix="/api/dropdown-config", tags=["dropdown-config"])


# ─── Schemas ─────────────────────────────────────────────────────────────────

class DropdownOptionCreate(BaseModel):
    category: str
    key: str
    label: str
    color: Optional[str] = None
    icon: Optional[str] = None
    sort_order: int = 0

class DropdownOptionUpdate(BaseModel):
    label: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None

class DropdownOptionResponse(BaseModel):
    id: str
    category: str
    key: str
    label: str
    color: Optional[str] = None
    icon: Optional[str] = None
    sort_order: int
    is_active: bool
    is_default: bool
    organization_id: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Default seed data ───────────────────────────────────────────────────────

DEFAULT_OPTIONS = [
    # Task Status
    {"category": "task_status", "key": "draft",       "label": "Draft",       "color": "#6b7280", "sort_order": 0},
    {"category": "task_status", "key": "backlog",     "label": "Backlog",     "color": "#8b5cf6", "sort_order": 1},
    {"category": "task_status", "key": "todo",        "label": "To Do",       "color": "#6b7280", "sort_order": 2},
    {"category": "task_status", "key": "in_progress", "label": "In Progress", "color": "#3b82f6", "sort_order": 3},
    {"category": "task_status", "key": "review",      "label": "Review",      "color": "#eab308", "sort_order": 4},
    {"category": "task_status", "key": "blocked",     "label": "Blocked",     "color": "#ef4444", "sort_order": 5},
    {"category": "task_status", "key": "completed",   "label": "Completed",   "color": "#22c55e", "sort_order": 6},
    {"category": "task_status", "key": "cancelled",   "label": "Cancelled",   "color": "#9ca3af", "sort_order": 7},

    # Task Priority
    {"category": "task_priority", "key": "low",      "label": "Low",      "color": "#22c55e", "sort_order": 0},
    {"category": "task_priority", "key": "medium",   "label": "Medium",   "color": "#eab308", "sort_order": 1},
    {"category": "task_priority", "key": "high",     "label": "High",     "color": "#f97316", "sort_order": 2},
    {"category": "task_priority", "key": "urgent",   "label": "Urgent",   "color": "#ef4444", "sort_order": 3},
    {"category": "task_priority", "key": "critical", "label": "Critical", "color": "#dc2626", "sort_order": 4},

    # Task Type
    {"category": "task_type", "key": "personal",    "label": "Personal",    "color": "#8b5cf6", "sort_order": 0},
    {"category": "task_type", "key": "project",     "label": "Project",     "color": "#3b82f6", "sort_order": 1},
    {"category": "task_type", "key": "bug",         "label": "Bug",         "color": "#ef4444", "sort_order": 2},
    {"category": "task_type", "key": "feature",     "label": "Feature",     "color": "#22c55e", "sort_order": 3},
    {"category": "task_type", "key": "improvement", "label": "Improvement", "color": "#06b6d4", "sort_order": 4},

    # Project Status
    {"category": "project_status", "key": "draft",     "label": "Draft",     "color": "#6b7280", "sort_order": 0},
    {"category": "project_status", "key": "active",    "label": "Active",    "color": "#22c55e", "sort_order": 1},
    {"category": "project_status", "key": "on_hold",   "label": "On Hold",   "color": "#eab308", "sort_order": 2},
    {"category": "project_status", "key": "completed", "label": "Completed", "color": "#3b82f6", "sort_order": 3},
    {"category": "project_status", "key": "archived",  "label": "Archived",  "color": "#9ca3af", "sort_order": 4},

    # Project Priority
    {"category": "project_priority", "key": "low",      "label": "Low",      "color": "#22c55e", "sort_order": 0},
    {"category": "project_priority", "key": "medium",   "label": "Medium",   "color": "#eab308", "sort_order": 1},
    {"category": "project_priority", "key": "high",     "label": "High",     "color": "#f97316", "sort_order": 2},
    {"category": "project_priority", "key": "critical", "label": "Critical", "color": "#ef4444", "sort_order": 3},

    # User Role
    {"category": "user_role", "key": "employee",        "label": "Employee",        "color": "#6b7280", "sort_order": 0},
    {"category": "user_role", "key": "manager",         "label": "Manager",         "color": "#3b82f6", "sort_order": 1},
    {"category": "user_role", "key": "admin",           "label": "Admin",           "color": "#8b5cf6", "sort_order": 2},
    {"category": "user_role", "key": "org_admin",       "label": "Org Admin",       "color": "#f97316", "sort_order": 3},
    {"category": "user_role", "key": "team_lead",       "label": "Team Lead",       "color": "#06b6d4", "sort_order": 4},
    {"category": "user_role", "key": "project_manager", "label": "Project Manager", "color": "#eab308", "sort_order": 5},
    {"category": "user_role", "key": "contributor",     "label": "Contributor",     "color": "#22c55e", "sort_order": 6},
    {"category": "user_role", "key": "stakeholder",     "label": "Stakeholder",     "color": "#9ca3af", "sort_order": 7},

    # Expertise Level
    {"category": "expertise_level", "key": "junior", "label": "Junior", "color": "#22c55e", "sort_order": 0},
    {"category": "expertise_level", "key": "mid",    "label": "Mid",    "color": "#3b82f6", "sort_order": 1},
    {"category": "expertise_level", "key": "senior", "label": "Senior", "color": "#8b5cf6", "sort_order": 2},
    {"category": "expertise_level", "key": "lead",   "label": "Lead",   "color": "#f97316", "sort_order": 3},

    # Client Region
    {"category": "client_region", "key": "india",       "label": "India",        "sort_order": 0},
    {"category": "client_region", "key": "us",          "label": "United States", "sort_order": 1},
    {"category": "client_region", "key": "uk",          "label": "United Kingdom","sort_order": 2},
    {"category": "client_region", "key": "middle_east", "label": "Middle East",   "sort_order": 3},
    {"category": "client_region", "key": "europe",      "label": "Europe",        "sort_order": 4},
    {"category": "client_region", "key": "sea",         "label": "South East Asia","sort_order": 5},
    {"category": "client_region", "key": "africa",      "label": "Africa",        "sort_order": 6},
    {"category": "client_region", "key": "latam",       "label": "Latin America", "sort_order": 7},

    # Business Sector
    {"category": "client_business_sector", "key": "technology",     "label": "Technology",      "sort_order": 0},
    {"category": "client_business_sector", "key": "finance",        "label": "Finance",          "sort_order": 1},
    {"category": "client_business_sector", "key": "healthcare",     "label": "Healthcare",       "sort_order": 2},
    {"category": "client_business_sector", "key": "retail",         "label": "Retail",           "sort_order": 3},
    {"category": "client_business_sector", "key": "education",      "label": "Education",        "sort_order": 4},
    {"category": "client_business_sector", "key": "manufacturing",  "label": "Manufacturing",    "sort_order": 5},
    {"category": "client_business_sector", "key": "real_estate",    "label": "Real Estate",      "sort_order": 6},
    {"category": "client_business_sector", "key": "media",          "label": "Media & Entertainment", "sort_order": 7},
    {"category": "client_business_sector", "key": "consulting",     "label": "Consulting",       "sort_order": 8},
    {"category": "client_business_sector", "key": "logistics",      "label": "Logistics",        "sort_order": 9},

    # Company Size
    {"category": "client_company_size", "key": "1_10",    "label": "1–10 employees",    "sort_order": 0},
    {"category": "client_company_size", "key": "11_50",   "label": "11–50 employees",   "sort_order": 1},
    {"category": "client_company_size", "key": "51_200",  "label": "51–200 employees",  "sort_order": 2},
    {"category": "client_company_size", "key": "201_500", "label": "201–500 employees", "sort_order": 3},
    {"category": "client_company_size", "key": "500_plus","label": "500+ employees",    "sort_order": 4},

    # Billing Type
    {"category": "client_billing_type", "key": "hourly",     "label": "Hourly",     "sort_order": 0},
    {"category": "client_billing_type", "key": "fixed",      "label": "Fixed",      "sort_order": 1},
    {"category": "client_billing_type", "key": "retainer",   "label": "Retainer",   "sort_order": 2},
    {"category": "client_billing_type", "key": "milestone",  "label": "Milestone",  "sort_order": 3},
    {"category": "client_billing_type", "key": "pro_rata",   "label": "Pro-Rata",   "sort_order": 4},

    # Contact Person Role
    {"category": "contact_person_role", "key": "ceo",       "label": "CEO",            "sort_order": 0},
    {"category": "contact_person_role", "key": "cto",       "label": "CTO",            "sort_order": 1},
    {"category": "contact_person_role", "key": "cfo",       "label": "CFO",            "sort_order": 2},
    {"category": "contact_person_role", "key": "pm",        "label": "Project Manager","sort_order": 3},
    {"category": "contact_person_role", "key": "developer", "label": "Developer",      "sort_order": 4},
    {"category": "contact_person_role", "key": "designer",  "label": "Designer",       "sort_order": 5},
    {"category": "contact_person_role", "key": "sales",     "label": "Sales",          "sort_order": 6},
    {"category": "contact_person_role", "key": "support",   "label": "Support",        "sort_order": 7},
    {"category": "contact_person_role", "key": "legal",     "label": "Legal",          "sort_order": 8},

    # Currency
    {"category": "currency", "key": "USD", "label": "USD – US Dollar",        "sort_order": 0},
    {"category": "currency", "key": "EUR", "label": "EUR – Euro",             "sort_order": 1},
    {"category": "currency", "key": "GBP", "label": "GBP – British Pound",   "sort_order": 2},
    {"category": "currency", "key": "INR", "label": "INR – Indian Rupee",     "sort_order": 3},
    {"category": "currency", "key": "EGP", "label": "EGP – Egyptian Pound",  "sort_order": 4},
    {"category": "currency", "key": "AED", "label": "AED – UAE Dirham",      "sort_order": 5},
    {"category": "currency", "key": "SAR", "label": "SAR – Saudi Riyal",     "sort_order": 6},

    # Team Member Role
    {"category": "team_member_role", "key": "lead",        "label": "Lead",        "color": "#f97316", "sort_order": 0},
    {"category": "team_member_role", "key": "member",      "label": "Member",      "color": "#3b82f6", "sort_order": 1},
    {"category": "team_member_role", "key": "contributor", "label": "Contributor", "color": "#22c55e", "sort_order": 2},
    {"category": "team_member_role", "key": "observer",    "label": "Observer",    "color": "#6b7280", "sort_order": 3},

    # Workspace Member Role
    {"category": "workspace_member_role", "key": "admin",  "label": "Admin",  "color": "#8b5cf6", "sort_order": 0},
    {"category": "workspace_member_role", "key": "member", "label": "Member", "color": "#3b82f6", "sort_order": 1},
    {"category": "workspace_member_role", "key": "viewer", "label": "Viewer", "color": "#6b7280", "sort_order": 2},

    # Department Type (bonus)
    {"category": "department_type", "key": "engineering",  "label": "Engineering",   "sort_order": 0},
    {"category": "department_type", "key": "design",       "label": "Design",        "sort_order": 1},
    {"category": "department_type", "key": "marketing",    "label": "Marketing",     "sort_order": 2},
    {"category": "department_type", "key": "sales",        "label": "Sales",         "sort_order": 3},
    {"category": "department_type", "key": "hr",           "label": "Human Resources","sort_order": 4},
    {"category": "department_type", "key": "finance",      "label": "Finance",       "sort_order": 5},
    {"category": "department_type", "key": "operations",   "label": "Operations",    "sort_order": 6},
    {"category": "department_type", "key": "product",      "label": "Product",       "sort_order": 7},
    {"category": "department_type", "key": "support",      "label": "Customer Support","sort_order": 8},
]


# ─── Category metadata for UI labels ─────────────────────────────────────────

CATEGORY_META = {
    "task_status":            {"label": "Task Status",           "group": "Tasks"},
    "task_priority":          {"label": "Task Priority",         "group": "Tasks"},
    "task_type":              {"label": "Task Type",             "group": "Tasks"},
    "project_status":         {"label": "Project Status",        "group": "Projects"},
    "project_priority":       {"label": "Project Priority",      "group": "Projects"},
    "user_role":              {"label": "User Role",             "group": "Employees"},
    "expertise_level":        {"label": "Expertise Level",       "group": "Employees"},
    "client_region":          {"label": "Client Region",         "group": "Clients"},
    "client_business_sector": {"label": "Business Sector",       "group": "Clients"},
    "client_company_size":    {"label": "Company Size",          "group": "Clients"},
    "client_billing_type":    {"label": "Billing Type",          "group": "Clients"},
    "contact_person_role":    {"label": "Contact Person Role",   "group": "Clients"},
    "currency":               {"label": "Currency",              "group": "Finance"},
    "team_member_role":       {"label": "Team Member Role",      "group": "Teams"},
    "workspace_member_role":  {"label": "Workspace Member Role", "group": "Workspaces"},
    "department_type":        {"label": "Department Type",       "group": "Departments"},
}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _require_super_admin(current_user: User):
    if not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Super admin access required")


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/categories")
def list_categories(
    current_user: User = Depends(get_current_active_user),
):
    """Return all available dropdown categories with metadata."""
    return [
        {"category": cat, **meta}
        for cat, meta in CATEGORY_META.items()
    ]


@router.get("", response_model=List[DropdownOptionResponse])
def list_options(
    category: Optional[str] = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List dropdown options. Super admins see all; org users see system defaults + their org overrides."""
    org_id = get_org_id(current_user)

    query = db.query(DropdownConfig)

    # Filter: system-wide defaults + org-specific overrides
    if is_super_admin(current_user):
        query = query.filter(DropdownConfig.organization_id.is_(None))
    else:
        query = query.filter(
            (DropdownConfig.organization_id.is_(None)) |
            (DropdownConfig.organization_id == org_id)
        )

    if category:
        query = query.filter(DropdownConfig.category == category)

    if not include_inactive:
        query = query.filter(DropdownConfig.is_active == True)  # noqa: E712

    query = query.order_by(DropdownConfig.category, DropdownConfig.sort_order, DropdownConfig.label)
    return query.all()


@router.post("", response_model=DropdownOptionResponse, status_code=status.HTTP_201_CREATED)
def create_option(
    data: DropdownOptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new dropdown option. Super admins create system-wide; org admins create org-specific."""
    from app.utils.role_guards import is_admin as _is_admin
    if not is_super_admin(current_user) and not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    org_id = None if is_super_admin(current_user) else get_org_id(current_user)

    # Check for duplicate key in same category + org scope
    existing = db.query(DropdownConfig).filter(
        DropdownConfig.category == data.category,
        DropdownConfig.key == data.key,
        DropdownConfig.organization_id == org_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Key '{data.key}' already exists in category '{data.category}'")

    option = DropdownConfig(
        id=str(uuid.uuid4()),
        organization_id=org_id,
        **data.model_dump(),
    )
    db.add(option)
    db.commit()
    db.refresh(option)
    return option


@router.put("/{option_id}", response_model=DropdownOptionResponse)
def update_option(
    option_id: str,
    data: DropdownOptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a dropdown option."""
    from app.utils.role_guards import is_admin as _is_admin
    if not is_super_admin(current_user) and not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    option = db.query(DropdownConfig).filter(DropdownConfig.id == option_id).first()
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")

    # Org admins can only edit their own org's options
    if not is_super_admin(current_user):
        if str(option.organization_id or "") != str(get_org_id(current_user) or ""):
            raise HTTPException(status_code=403, detail="Access denied")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(option, field, value)
    db.commit()
    db.refresh(option)
    return option


@router.delete("/{option_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_option(
    option_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a dropdown option. Cannot delete system defaults."""
    from app.utils.role_guards import is_admin as _is_admin
    if not is_super_admin(current_user) and not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    option = db.query(DropdownConfig).filter(DropdownConfig.id == option_id).first()
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")

    if bool(option.is_default) and not is_super_admin(current_user):
        raise HTTPException(status_code=400, detail="Cannot delete system default options")

    if not is_super_admin(current_user):
        if str(option.organization_id or "") != str(get_org_id(current_user) or ""):
            raise HTTPException(status_code=403, detail="Access denied")

    db.delete(option)
    db.commit()


@router.post("/seed", status_code=status.HTTP_200_OK)
def seed_defaults(
    force: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Seed all system-default dropdown options. Super admin only. Use force=true to re-seed."""
    _require_super_admin(current_user)

    created = 0
    skipped = 0

    for opt_data in DEFAULT_OPTIONS:
        existing = db.query(DropdownConfig).filter(
            DropdownConfig.category == opt_data["category"],
            DropdownConfig.key == opt_data["key"],
            DropdownConfig.organization_id.is_(None),
        ).first()

        if existing and not force:
            skipped += 1
            continue

        if existing and force:
            for field, val in opt_data.items():
                setattr(existing, field, val)
            db.add(existing)
        else:
            record = DropdownConfig(
                id=str(uuid.uuid4()),
                organization_id=None,
                is_default=True,
                **opt_data,
            )
            db.add(record)
            created += 1

    db.commit()
    return {"created": created, "skipped": skipped, "total": len(DEFAULT_OPTIONS)}
