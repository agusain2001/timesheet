import uuid
from datetime import datetime, date
from enum import Enum as PyEnum
from sqlalchemy import Column, String, Date, ForeignKey, DateTime, Text, JSON, Boolean, Float, Integer
from sqlalchemy.orm import relationship
from app.database import Base


class ProjectStatus(str, PyEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class ProjectPriority(str, PyEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ProjectManager(Base):
    """Association table for project managers with additional fields."""
    __tablename__ = "project_managers"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    role = Column(String(50), default="manager")
    start_date = Column(Date, default=date.today)
    end_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="project_managers")
    user = relationship("User", backref="project_manager_roles")


class Project(Base):
    """Enhanced Project model with phases, budget, and comprehensive tracking."""
    __tablename__ = "projects"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=True)  # Project code
    description = Column(Text, nullable=True)
    
    # Organization
    client_id = Column(String(36), ForeignKey("clients.id"), nullable=True)
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True)
    team_id = Column(String(36), ForeignKey("teams.id"), nullable=True)
    business_owner_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    # Project details
    priority = Column(String(20), default=ProjectPriority.MEDIUM.value)
    status = Column(String(20), default=ProjectStatus.DRAFT.value)
    
    # Budget
    budget = Column(Float, nullable=True)
    budget_currency = Column(String(10), default="EGP")
    actual_cost = Column(Float, default=0)
    
    # Dates
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    actual_start_date = Column(Date, nullable=True)
    actual_end_date = Column(Date, nullable=True)
    
    # Progress
    progress_percentage = Column(Integer, default=0)
    
    # Contact and notes
    contacts = Column(JSON, nullable=True)  # Contact numbers: [{name, phone, type, isPrimary}]
    notes = Column(Text, nullable=True)
    
    # Settings
    settings = Column(JSON, nullable=True)  # Project-specific settings
    custom_fields = Column(JSON, nullable=True)
    
    # AI-enhanced fields
    ai_health_score = Column(Float, nullable=True)  # AI-calculated project health
    ai_risk_factors = Column(JSON, nullable=True)  # AI-identified risks
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    client = relationship("Client", back_populates="projects")
    department = relationship("Department", back_populates="projects")
    team = relationship("Team", back_populates="projects")
    business_owner = relationship("User", foreign_keys=[business_owner_id], backref="owned_projects")
    project_managers = relationship("ProjectManager", back_populates="project", cascade="all, delete-orphan")
    
    # Structure
    phases = relationship("ProjectPhase", back_populates="project", cascade="all, delete-orphan")
    epics = relationship("Epic", back_populates="project", cascade="all, delete-orphan")
    milestones = relationship("Milestone", back_populates="project", cascade="all, delete-orphan")
    
    # Work items
    tasks = relationship("Task", back_populates="project")
    time_entries = relationship("TimeEntry", back_populates="project")
    expenses = relationship("Expense", back_populates="project")
    
    @property
    def managers(self):
        """Get list of manager users."""
        return [pm.user for pm in self.project_managers]
