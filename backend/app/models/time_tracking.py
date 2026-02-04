"""
Time Tracking Models
Active timer and time log models for time tracking functionality.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Text, ForeignKey, DateTime, Boolean, func
from sqlalchemy.orm import relationship
from app.database import Base


class ActiveTimer(Base):
    """Active timer for live time tracking - only one per user."""
    __tablename__ = "active_timers"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, unique=True)
    task_id = Column(String(36), ForeignKey("tasks.id"), nullable=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True)
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    notes = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="active_timer")
    task = relationship("Task", foreign_keys=[task_id])
    project = relationship("Project", foreign_keys=[project_id])


class TimeLog(Base):
    """Time log for historical time entries (completed timers or manual entries)."""
    __tablename__ = "time_logs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    task_id = Column(String(36), ForeignKey("tasks.id"), nullable=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True)
    date = Column(DateTime, nullable=False)
    hours = Column(Float, nullable=False)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    is_billable = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="time_logs")
    task = relationship("Task", foreign_keys=[task_id])
    project = relationship("Project", foreign_keys=[project_id])


class Capacity(Base):
    """Weekly capacity tracking for users."""
    __tablename__ = "capacities"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    week_starting = Column(DateTime, nullable=False)
    available_hours = Column(Float, default=40.0)
    allocated_hours = Column(Float, default=0.0)
    logged_hours = Column(Float, default=0.0)
    
    # Relationships
    user = relationship("User", back_populates="capacities")
