import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, Date, Float, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base


class TimesheetStatus(str, PyEnum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"


class Timesheet(Base):
    """Timesheet model for weekly time tracking."""
    __tablename__ = "timesheets"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    week_starting = Column(Date, nullable=False)
    status = Column(String(20), default=TimesheetStatus.DRAFT.value)
    total_hours = Column(Float, default=0.0)
    achievement = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    submitted_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="timesheets")
    entries = relationship("TimeEntry", back_populates="timesheet", cascade="all, delete-orphan")


class TimeEntry(Base):
    """TimeEntry model for individual day/project time entries."""
    __tablename__ = "time_entries"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    timesheet_id = Column(String(36), ForeignKey("timesheets.id"), nullable=False)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True)
    task_id = Column(String(36), ForeignKey("tasks.id"), nullable=True)
    day = Column(Date, nullable=False)
    hours = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    
    # Relationships
    timesheet = relationship("Timesheet", back_populates="entries")
    project = relationship("Project", back_populates="time_entries")
    task = relationship("Task", back_populates="time_entries")
