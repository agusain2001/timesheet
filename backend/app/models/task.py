import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, Text, Float, ForeignKey, DateTime, Integer, Boolean, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class TaskType(str, PyEnum):
    PERSONAL = "personal"
    PROJECT = "project"
    ASSIGNED = "assigned"


class TaskPriority(str, PyEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskStatus(str, PyEnum):
    BACKLOG = "backlog"
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    WAITING = "waiting"
    BLOCKED = "blocked"
    REVIEW = "review"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    # Legacy status for backward compatibility
    OPEN = "open"
    OVERDUE = "overdue"


class Task(Base):
    """Enhanced Task model with subtasks, dependencies, and collaboration."""
    __tablename__ = "tasks"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    task_type = Column(String(20), default=TaskType.PERSONAL.value)
    
    # Hierarchy
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True)
    epic_id = Column(String(36), ForeignKey("epics.id"), nullable=True)
    phase_id = Column(String(36), ForeignKey("project_phases.id"), nullable=True)
    parent_task_id = Column(String(36), ForeignKey("tasks.id"), nullable=True)  # Subtasks
    
    # Organization
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True)
    team_id = Column(String(36), ForeignKey("teams.id"), nullable=True)
    
    # Assignees
    assignee_id = Column(String(36), ForeignKey("users.id"), nullable=True)  # Primary assignee
    owner_id = Column(String(36), ForeignKey("users.id"), nullable=True)  # Task owner/creator
    
    # Task details
    priority = Column(String(20), default=TaskPriority.MEDIUM.value)
    status = Column(String(20), default=TaskStatus.TODO.value)
    
    # Dates
    start_date = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Effort tracking
    estimated_hours = Column(Float, nullable=True)
    actual_hours = Column(Float, default=0)
    
    # Extensibility
    custom_fields = Column(JSON, nullable=True)  # Flexible custom fields
    tags = Column(JSON, nullable=True)  # Labels/tags array
    
    # Ordering
    order = Column(Integer, default=0)  # For Kanban/list ordering
    
    # AI-enhanced fields
    ai_priority_score = Column(Float, nullable=True)  # AI-calculated priority
    ai_risk_score = Column(Float, nullable=True)  # Deadline risk prediction
    ai_suggestions = Column(JSON, nullable=True)  # AI recommendations
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="tasks")
    epic = relationship("Epic", back_populates="tasks")
    phase = relationship("ProjectPhase", back_populates="tasks")
    parent_task = relationship("Task", remote_side=[id], backref="subtasks")
    department = relationship("Department", back_populates="tasks")
    team = relationship("Team", back_populates="tasks")
    assignee = relationship("User", back_populates="assigned_tasks", foreign_keys=[assignee_id])
    owner = relationship("User", foreign_keys=[owner_id], backref="owned_tasks")
    time_entries = relationship("TimeEntry", back_populates="task")
    
    # Collaboration relationships
    task_assignees = relationship("TaskAssignee", back_populates="task", cascade="all, delete-orphan")
    comments = relationship("TaskComment", back_populates="task", cascade="all, delete-orphan")
    attachments = relationship("TaskAttachment", back_populates="task", cascade="all, delete-orphan")
    audit_logs = relationship("TaskAuditLog", back_populates="task", cascade="all, delete-orphan")
