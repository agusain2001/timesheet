"""Expense models for tracking employee expenses."""
import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, Date, Text, ForeignKey, Numeric, DateTime, Integer, JSON, func
from sqlalchemy.orm import relationship
from app.database import Base


class ExpenseStatus(str, PyEnum):
    """Status states for expense lifecycle."""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    RETURNED = "returned"
    PAID = "paid"


class ExpenseType(str, PyEnum):
    """Types of expense items."""
    MEAL = "meal"
    TRANSPORT = "transport"
    ACCOMMODATION = "accommodation"
    SUPPLIES = "supplies"
    COMMUNICATION = "communication"
    ENTERTAINMENT = "entertainment"
    TRAVEL = "travel"
    SOFTWARE = "software"
    EQUIPMENT = "equipment"
    OTHER = "other"


class PaymentMethod(str, PyEnum):
    """Payment methods for expenses."""
    CASH = "cash"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    BANK_TRANSFER = "bank_transfer"
    COMPANY_CARD = "company_card"
    PETTY_CASH = "petty_cash"
    OTHER = "other"


class Expense(Base):
    """Expense model for tracking employee expenses."""
    __tablename__ = "expenses"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Project/Cost Center
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True)
    cost_center_id = Column(String(36), ForeignKey("cost_centers.id"), nullable=True)
    
    # Financial
    total_amount = Column(Numeric(12, 2), default=0.0)
    currency = Column(String(10), default="EGP")
    
    # Vendor/Payment
    vendor = Column(String(255), nullable=True)
    payment_method = Column(String(30), default=PaymentMethod.CASH.value)
    
    # Status & Approval
    status = Column(String(20), default=ExpenseStatus.DRAFT.value)
    rejection_reason = Column(Text, nullable=True)
    return_reason = Column(Text, nullable=True)
    current_approval_level = Column(Integer, default=0)
    required_approval_levels = Column(Integer, default=1)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    submitted_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="expenses")
    project = relationship("Project", back_populates="expenses")
    cost_center = relationship("CostCenter", back_populates="expenses")
    items = relationship("ExpenseItem", back_populates="expense", cascade="all, delete-orphan")
    approvals = relationship("ExpenseApproval", back_populates="expense", cascade="all, delete-orphan")
    audit_logs = relationship("ExpenseAuditLog", back_populates="expense", cascade="all, delete-orphan")


class ExpenseItem(Base):
    """ExpenseItem model for individual expense line items."""
    __tablename__ = "expense_items"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    expense_id = Column(String(36), ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False)
    
    # Item details
    date = Column(Date, nullable=False)
    expense_type = Column(String(30), default=ExpenseType.OTHER.value)
    category_id = Column(String(36), ForeignKey("expense_categories.id"), nullable=True)
    
    # Financial
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default="EGP")
    currency_rate = Column(Numeric(10, 4), default=1.0)
    
    # Description
    description = Column(Text, nullable=True)
    vendor = Column(String(255), nullable=True)
    
    # Receipt/Attachments
    attachment_url = Column(String(500), nullable=True)
    receipt_path = Column(String(500), nullable=True)
    ocr_data = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    expense = relationship("Expense", back_populates="items")
