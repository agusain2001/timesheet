"""Cost Center model for expense tracking and budget management."""
import uuid
from sqlalchemy import Column, String, Boolean, Numeric, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base


class CostCenter(Base):
    """Cost Center model for organizing expenses by business unit."""
    __tablename__ = "cost_centers"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    description = Column(String(500), nullable=True)
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True)
    budget_amount = Column(Numeric(12, 2), default=0)
    budget_period = Column(String(20), default="monthly")  # monthly, quarterly, yearly
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    department = relationship("Department", backref="cost_centers")
    expenses = relationship("Expense", back_populates="cost_center")
