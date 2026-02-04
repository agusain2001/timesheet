"""Expense Approval model for multi-level approval workflow."""
import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, Integer, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base


class ApprovalStatus(str, PyEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ExpenseApproval(Base):
    """Tracks multi-level approval decisions for expenses."""
    __tablename__ = "expense_approvals"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    expense_id = Column(String(36), ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False)
    approver_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    level = Column(Integer, default=1)  # Approval level (1, 2, 3...)
    status = Column(String(20), default=ApprovalStatus.PENDING.value)
    decision_at = Column(DateTime, nullable=True)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    expense = relationship("Expense", back_populates="approvals")
    approver = relationship("User")
