"""Automation models for if-this-then-that rules engine."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Integer, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class AutomationRule(Base):
    """If-this-then-that automation rules for tasks and projects."""
    __tablename__ = "automation_rules"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Trigger configuration
    trigger_event = Column(String(50), nullable=False)  # task_created, status_changed, due_date_passed, etc.
    trigger_conditions = Column(JSON, nullable=True)  # Array of condition objects
    # Example conditions: [{"field": "priority", "operator": "equals", "value": "high"}]
    
    # Action configuration
    actions = Column(JSON, nullable=False)  # Array of action objects
    # Example actions: [{"type": "change_status", "value": "in_review"}, {"type": "assign_to", "user_id": "..."}]
    
    # Scope
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True)
    team_id = Column(String(36), ForeignKey("teams.id"), nullable=True)
    
    # Metadata
    priority = Column(Integer, default=0)  # Higher priority rules run first
    run_count = Column(Integer, default=0)  # How many times this rule has run
    last_run_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    created_by = relationship("User", backref="created_automation_rules")


class AutomationLog(Base):
    """Log of automation rule executions."""
    __tablename__ = "automation_logs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    rule_id = Column(String(36), ForeignKey("automation_rules.id"), nullable=False)
    trigger_entity_type = Column(String(50), nullable=False)  # task, project, etc.
    trigger_entity_id = Column(String(36), nullable=False)
    trigger_event = Column(String(50), nullable=False)
    conditions_met = Column(JSON, nullable=True)  # Which conditions were evaluated
    actions_executed = Column(JSON, nullable=True)  # What actions were taken
    status = Column(String(20), default="success")  # success, failed, partial
    error_message = Column(Text, nullable=True)
    execution_time_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    rule = relationship("AutomationRule", backref="execution_logs")


class TaskTemplate(Base):
    """Reusable task templates."""
    __tablename__ = "task_templates"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Template configuration
    task_name_template = Column(String(255), nullable=False)
    task_description = Column(Text, nullable=True)
    default_priority = Column(String(20), default="medium")
    default_status = Column(String(20), default="todo")
    estimated_hours = Column(Integer, nullable=True)
    default_tags = Column(JSON, nullable=True)
    custom_fields = Column(JSON, nullable=True)
    
    # Subtask templates
    subtasks = Column(JSON, nullable=True)  # Array of subtask templates
    
    # Checklist items
    checklist = Column(JSON, nullable=True)  # Array of checklist items
    
    # Scope
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True)
    team_id = Column(String(36), ForeignKey("teams.id"), nullable=True)
    is_global = Column(Boolean, default=False)  # Available to all projects/teams
    
    is_active = Column(Boolean, default=True)
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    created_by = relationship("User", backref="created_task_templates")


class ProjectTemplate(Base):
    """Reusable project templates with phases, epics, and task templates."""
    __tablename__ = "project_templates"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Template configuration
    default_status = Column(String(20), default="draft")
    phases = Column(JSON, nullable=True)  # Array of phase templates
    epics = Column(JSON, nullable=True)  # Array of epic templates
    milestones = Column(JSON, nullable=True)  # Array of milestone templates
    task_templates = Column(JSON, nullable=True)  # Array of task template IDs or inline templates
    
    # Default settings
    default_settings = Column(JSON, nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    created_by = relationship("User", backref="created_project_templates")
