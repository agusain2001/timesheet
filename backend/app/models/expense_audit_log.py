"""Expense Audit Log model for tracking all expense changes."""
import uuid
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, JSON, func
from sqlalchemy.orm import relationship
from app.database import Base


class ExpenseAuditLog(Base):
    """Audit trail for expense changes and actions."""
    __tablename__ = "expense_audit_logs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    expense_id = Column(String(36), ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    action = Column(String(50), nullable=False)  # created, updated, submitted, approved, rejected, paid
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    expense = relationship("Expense", back_populates="audit_logs")
    user = relationship("User")
