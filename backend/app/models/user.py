import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Float, JSON, func
from sqlalchemy.orm import relationship
from app.database import Base


class UserRole(str, PyEnum):
    # Core roles
    ADMIN = "admin"
    MANAGER = "manager"
    EMPLOYEE = "employee"
    # Extended roles
    SYSTEM_ADMIN = "system_admin"
    ORG_ADMIN = "org_admin"
    PROJECT_MANAGER = "project_manager"
    TEAM_LEAD = "team_lead"
    CONTRIBUTOR = "contributor"
    STAKEHOLDER = "stakeholder"
    CLIENT = "client"


class AvailabilityStatus(str, PyEnum):
    AVAILABLE = "available"
    BUSY = "busy"
    AWAY = "away"
    DO_NOT_DISTURB = "dnd"
    OFFLINE = "offline"


class User(Base):
    """Enhanced User model with extended profile, skills, and preferences."""
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    
    # Organization
    role = Column(String(50), default=UserRole.EMPLOYEE.value)
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True)
    
    # Profile
    avatar_url = Column(String(500), nullable=True)
    position = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    bio = Column(Text, nullable=True)
    
    # Skills and expertise
    skills = Column(JSON, nullable=True)  # Array of skill tags
    expertise_level = Column(String(20), nullable=True)  # junior, mid, senior, lead
    
    # Working hours and availability
    working_hours_start = Column(String(10), default="09:00")
    working_hours_end = Column(String(10), default="17:00")
    timezone = Column(String(50), default="Africa/Cairo")
    availability_status = Column(String(20), default=AvailabilityStatus.AVAILABLE.value)
    
    # Weekly capacity
    capacity_hours_week = Column(Float, default=40.0)
    
    # Preferences
    notification_preferences = Column(JSON, nullable=True)
    ui_preferences = Column(JSON, nullable=True)  # Theme, layout, etc.
    
    # Settings
    settings = Column(JSON, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    department = relationship("Department", back_populates="employees")
    timesheets = relationship("Timesheet", back_populates="user")
    expenses = relationship("Expense", back_populates="user")
    support_requests = relationship("SupportRequest", back_populates="user")
    assigned_tasks = relationship("Task", back_populates="assignee", foreign_keys="Task.assignee_id")
    
    # Time tracking relationships
    active_timer = relationship("ActiveTimer", back_populates="user", uselist=False)
    time_logs = relationship("TimeLog", back_populates="user")
    capacities = relationship("Capacity", back_populates="user")
    
    # Advanced Features relationships
    saved_filters = relationship("SavedFilter", back_populates="user")
    comment_reactions = relationship("CommentReaction", back_populates="user")
    sent_invites = relationship("UserInvite", back_populates="invited_by")
    scheduled_reports = relationship("ScheduledReport", back_populates="created_by")
    mfa_settings = relationship("MFASettings", back_populates="user", uselist=False)
    task_templates = relationship("TaskTemplate", back_populates="created_by")
    project_templates = relationship("ProjectTemplate", back_populates="created_by")

