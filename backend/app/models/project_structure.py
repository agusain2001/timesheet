"""Project structure models - Phases, Epics, and Milestones."""
import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Text, Boolean, DateTime, Date, ForeignKey, Integer, Float, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class ProjectPhase(Base):
    """Project phase for organizing work into stages."""
    __tablename__ = "project_phases"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    order = Column(Integer, default=0)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    status = Column(String(20), default="not_started")  # not_started, in_progress, completed
    color = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="phases")
    epics = relationship("Epic", back_populates="phase", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="phase")


class Epic(Base):
    """Epic for grouping related tasks within a project."""
    __tablename__ = "epics"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    phase_id = Column(String(36), ForeignKey("project_phases.id"), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(20), nullable=True)
    priority = Column(String(20), default="medium")
    status = Column(String(20), default="open")  # open, in_progress, completed, cancelled
    start_date = Column(Date, nullable=True)
    target_date = Column(Date, nullable=True)
    order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="epics")
    phase = relationship("ProjectPhase", back_populates="epics")
    tasks = relationship("Task", back_populates="epic")


class Milestone(Base):
    """Milestone for tracking project deliverables and deadlines."""
    __tablename__ = "milestones"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    phase_id = Column(String(36), ForeignKey("project_phases.id"), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(Date, nullable=False)
    completed_date = Column(Date, nullable=True)
    is_completed = Column(Boolean, default=False)
    color = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="milestones")
