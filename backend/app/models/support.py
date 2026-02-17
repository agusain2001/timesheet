import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Boolean, func
from sqlalchemy.orm import relationship
from app.database import Base


class SupportStatus(str, PyEnum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class SupportPriority(str, PyEnum):
    URGENT = "urgent"
    HIGH = "high"
    NORMAL = "normal"
    LOW = "low"


class SupportRequest(Base):
    """Support request model for employee support tickets."""
    __tablename__ = "support_requests"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    subject = Column(String(255), nullable=True)
    message = Column(Text, nullable=False)
    priority = Column(String(20), default=SupportPriority.NORMAL.value)
    related_module = Column(String(50), nullable=True)
    image_url = Column(String(500), nullable=True)
    is_draft = Column(Boolean, default=False)
    recipient_ids = Column(Text, nullable=True)  # JSON-serialised list of user IDs
    status = Column(String(20), default=SupportStatus.OPEN.value)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    resolved_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="support_requests")
