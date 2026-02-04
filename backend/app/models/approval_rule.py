"""Approval Rule model for configuring auto-approval and approval levels."""
import uuid
from sqlalchemy import Column, String, Boolean, Integer, Numeric, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base


class ApprovalRule(Base):
    """Configurable rules for expense approvals."""
    __tablename__ = "approval_rules"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    
    # Amount thresholds
    min_amount = Column(Numeric(12, 2), nullable=True)  # Applies if expense >= this
    max_amount = Column(Numeric(12, 2), nullable=True)  # Auto-approve if expense <= this
    
    # Filters
    category = Column(String(50), nullable=True)  # Apply to specific category
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True)
    
    # Approval configuration
    required_levels = Column(Integer, default=1)  # Number of approval levels needed
    auto_approve = Column(Boolean, default=False)  # Auto-approve if conditions met
    
    # Status
    priority = Column(Integer, default=0)  # Higher = checked first
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    department = relationship("Department")
