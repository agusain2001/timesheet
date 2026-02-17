from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import UserResponse, UserUpdate, UserCreate, UserProfileResponse, UserProfileUpdate
from app.utils import get_current_active_user, get_password_hash

router = APIRouter()


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new user (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if email exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user with hashed password
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        password_hash=hashed_password,
        full_name=user_data.full_name,
        role=user_data.role or "employee",
        department_id=user_data.department_id,
        position=user_data.position,
        avatar_url=user_data.avatar_url,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information."""
    return current_user


@router.get("/profile", response_model=UserProfileResponse)
def get_user_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's detailed profile information."""
    # Fetch user with related projects
    from app.models import ProjectManager
    
    projects_query = db.query(ProjectManager).filter(
        ProjectManager.user_id == current_user.id
    ).all()
    
    # Build profile response
    profile_data = {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "employee_id": current_user.id,  # Using user_id as employee_id
        "alias": getattr(current_user, 'alias', None),
        "user_type": "individual",  # Default to individual
        "role": current_user.role,
        "avatar_url": current_user.avatar_url,
        "position": current_user.position,
        "phone": current_user.phone,
        "bio": current_user.bio,
        # Business Details - using custom attributes or defaults
        "region": getattr(current_user, 'region', None),
        "company_size": getattr(current_user, 'company_size', None),
        "business_sector": getattr(current_user, 'business_sector', None),
        "website": getattr(current_user, 'website', None),
        # Contact Information
        "contact_person_name": getattr(current_user, 'contact_person_name', current_user.full_name),
        "contact_person_role": getattr(current_user, 'contact_person_role', current_user.position),
        "primary_phone": getattr(current_user, 'primary_phone', current_user.phone),
        "secondary_phone": getattr(current_user, 'secondary_phone', None),
        # Financial & Billing
        "preferred_currency": getattr(current_user, 'preferred_currency', 'USD'),
        "billing_type": getattr(current_user, 'billing_type', 'Fixed'),
        # Working preferences
        "timezone": current_user.timezone,
        "working_hours_start": current_user.working_hours_start,
        "working_hours_end": current_user.working_hours_end,
        # Meta
        "is_active": current_user.is_active,
        "created_at": current_user.created_at,
        # Projects
        "projects": [{"id": pm.project_id, "name": pm.project.name if pm.project else "Unknown"} for pm in projects_query] if projects_query else []
    }
    
    return profile_data


@router.put("/profile", response_model=UserProfileResponse)
def update_user_profile(
    profile_data: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update current user's profile information."""
    # Update only fields that are provided
    update_dict = profile_data.model_dump(exclude_unset=True)
    
    # Standard User model fields
    standard_fields = ['full_name', 'position', 'avatar_url', 'phone', 'bio', 
                      'timezone', 'working_hours_start', 'working_hours_end']
    
    # Extended fields (stored in settings JSON or would need model update)
    extended_fields = ['region', 'company_size', 'business_sector', 'website',
                      'contact_person_name', 'contact_person_role', 
                      'primary_phone', 'secondary_phone',
                      'preferred_currency', 'billing_type']
    
    # Update standard fields
    for field in standard_fields:
        if field in update_dict:
            setattr(current_user, field, update_dict[field])
    
    # Store extended fields in settings JSON
    if not current_user.settings:
        current_user.settings = {}
    
    for field in extended_fields:
        if field in update_dict:
            current_user.settings[field] = update_dict[field]
    
    db.commit()
    db.refresh(current_user)
    
    # Return updated profile using the GET endpoint logic
    from app.models import ProjectManager
    
    projects_query = db.query(ProjectManager).filter(
        ProjectManager.user_id == current_user.id
    ).all()
    
    profile_response = {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "employee_id": current_user.id,
        "alias": getattr(current_user, 'alias', None),
        "user_type": "individual",
        "role": current_user.role,
        "avatar_url": current_user.avatar_url,
        "position": current_user.position,
        "phone": current_user.phone,
        "bio": current_user.bio,
        # Business Details
        "region": current_user.settings.get('region') if current_user.settings else None,
        "company_size": current_user.settings.get('company_size') if current_user.settings else None,
        "business_sector": current_user.settings.get('business_sector') if current_user.settings else None,
        "website": current_user.settings.get('website') if current_user.settings else None,
        # Contact Information
        "contact_person_name": current_user.settings.get('contact_person_name', current_user.full_name) if current_user.settings else current_user.full_name,
        "contact_person_role": current_user.settings.get('contact_person_role', current_user.position) if current_user.settings else current_user.position,
        "primary_phone": current_user.settings.get('primary_phone', current_user.phone) if current_user.settings else current_user.phone,
        "secondary_phone": current_user.settings.get('secondary_phone') if current_user.settings else None,
        # Financial & Billing
        "preferred_currency": current_user.settings.get('preferred_currency', 'USD') if current_user.settings else 'USD',
        "billing_type": current_user.settings.get('billing_type', 'Fixed') if current_user.settings else 'Fixed',
        # Working preferences
        "timezone": current_user.timezone,
        "working_hours_start": current_user.working_hours_start,
        "working_hours_end": current_user.working_hours_end,
        # Meta
        "is_active": current_user.is_active,
        "created_at": current_user.created_at,
        # Projects
        "projects": [{"id": pm.project_id, "name": pm.project.name if pm.project else "Unknown"} for pm in projects_query] if projects_query else []
    }
    
    return profile_response


@router.get("/", response_model=List[UserResponse])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    department_id: str = None,
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all users with optional filters."""
    query = db.query(User)
    
    if department_id:
        query = query.filter(User.department_id == department_id)
    if status == "active":
        query = query.filter(User.is_active == True)
    elif status == "inactive":
        query = query.filter(User.is_active == False)
    
    return query.offset(skip).limit(limit).all()


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific user by ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Only admin or the user themselves can update
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a user (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    return None
