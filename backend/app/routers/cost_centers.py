"""Cost Center Router - CRUD operations for cost centers."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import CostCenter, User
from app.schemas import CostCenterCreate, CostCenterUpdate, CostCenterResponse
from app.utils import get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[CostCenterResponse])
def get_cost_centers(
    skip: int = 0,
    limit: int = 100,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all cost centers."""
    query = db.query(CostCenter)
    
    if not include_inactive:
        query = query.filter(CostCenter.is_active == True)
    
    return query.order_by(CostCenter.name).offset(skip).limit(limit).all()


@router.get("/{cost_center_id}", response_model=CostCenterResponse)
def get_cost_center(
    cost_center_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific cost center by ID."""
    cost_center = db.query(CostCenter).filter(CostCenter.id == cost_center_id).first()
    if not cost_center:
        raise HTTPException(status_code=404, detail="Cost center not found")
    return cost_center


@router.post("/", response_model=CostCenterResponse, status_code=status.HTTP_201_CREATED)
def create_cost_center(
    data: CostCenterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new cost center (admin/manager only)."""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Admin/Manager access required")
    
    # Check for duplicate code
    existing = db.query(CostCenter).filter(CostCenter.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cost center code already exists")
    
    cost_center = CostCenter(**data.model_dump())
    db.add(cost_center)
    db.commit()
    db.refresh(cost_center)
    return cost_center


@router.put("/{cost_center_id}", response_model=CostCenterResponse)
def update_cost_center(
    cost_center_id: str,
    data: CostCenterUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a cost center (admin/manager only)."""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Admin/Manager access required")
    
    cost_center = db.query(CostCenter).filter(CostCenter.id == cost_center_id).first()
    if not cost_center:
        raise HTTPException(status_code=404, detail="Cost center not found")
    
    # Check for duplicate code if code is being updated
    if data.code and data.code != cost_center.code:
        existing = db.query(CostCenter).filter(CostCenter.code == data.code).first()
        if existing:
            raise HTTPException(status_code=400, detail="Cost center code already exists")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(cost_center, key, value)
    
    db.commit()
    db.refresh(cost_center)
    return cost_center


@router.delete("/{cost_center_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cost_center(
    cost_center_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a cost center (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    cost_center = db.query(CostCenter).filter(CostCenter.id == cost_center_id).first()
    if not cost_center:
        raise HTTPException(status_code=404, detail="Cost center not found")
    
    # Soft delete by deactivating
    cost_center.is_active = False
    db.commit()
    return None
