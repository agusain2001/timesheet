"""Task dependency model for managing task relationships."""
import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class DependencyType(str, PyEnum):
    """Types of task dependencies."""
    FINISH_TO_START = "FS"   # Predecessor must finish before successor starts
    START_TO_START = "SS"    # Both tasks start together
    FINISH_TO_FINISH = "FF"  # Both tasks finish together
    START_TO_FINISH = "SF"   # Predecessor must start before successor finishes


class TaskDependency(Base):
    """Task dependency model for managing task relationships and constraints."""
    __tablename__ = "task_dependencies"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    predecessor_id = Column(String(36), ForeignKey("tasks.id"), nullable=False)
    successor_id = Column(String(36), ForeignKey("tasks.id"), nullable=False)
    dependency_type = Column(String(10), default=DependencyType.FINISH_TO_START.value)
    lag_days = Column(Integer, default=0)  # Delay between tasks (can be negative for lead)
    is_blocking = Column(Boolean, default=True)  # If true, blocks successor until dependency met
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    predecessor = relationship("Task", foreign_keys=[predecessor_id], backref="successor_dependencies")
    successor = relationship("Task", foreign_keys=[successor_id], backref="predecessor_dependencies")
