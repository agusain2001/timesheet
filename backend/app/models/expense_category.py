"""Expense Category model for categorizing expenses."""
import uuid
from sqlalchemy import Column, String, Boolean, Numeric, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class ExpenseCategory(Base):
    """Categories for organizing and tracking expenses."""
    __tablename__ = "expense_categories"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=False)
    description = Column(String(500), nullable=True)
    icon = Column(String(50), nullable=True)  # Icon identifier
    color = Column(String(20), nullable=True)  # Hex color code
    
    # Budget settings
    default_budget = Column(Numeric(12, 2), nullable=True)
    requires_receipt = Column(Boolean, default=False)
    
    # Status
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
