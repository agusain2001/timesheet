"""Notification models for in-app and email notifications."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Integer, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class Notification(Base):
    """In-app notifications for users."""
    __tablename__ = "notifications"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    type = Column(String(50), nullable=False)  # task_assigned, due_soon, overdue, mention, comment, etc.
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    link = Column(String(500), nullable=True)  # URL to navigate on click
    icon = Column(String(50), nullable=True)
    data = Column(JSON, nullable=True)  # Additional data for the notification
    is_read = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", backref="user_notifications")


class NotificationPreference(Base):
    """User notification preferences."""
    __tablename__ = "notification_preferences"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, unique=True)
    email_enabled = Column(Boolean, default=True)
    push_enabled = Column(Boolean, default=True)
    
    # Specific notification type preferences
    task_assigned = Column(Boolean, default=True)
    task_completed = Column(Boolean, default=True)
    task_due_soon = Column(Boolean, default=True)
    task_overdue = Column(Boolean, default=True)
    task_commented = Column(Boolean, default=True)
    task_mentioned = Column(Boolean, default=True)
    project_updates = Column(Boolean, default=True)
    team_updates = Column(Boolean, default=True)
    
    # Digest settings
    daily_digest = Column(Boolean, default=False)
    weekly_digest = Column(Boolean, default=True)
    digest_time = Column(String(10), default="09:00")  # Time of day for digest
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="user_notification_prefs")


class NotificationRule(Base):
    """Automated notification and escalation rules."""
    __tablename__ = "notification_rules"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    trigger_type = Column(String(50), nullable=False)  # before_due, on_due, overdue, status_change
    trigger_value = Column(Integer, nullable=True)  # Days/hours before/after
    trigger_unit = Column(String(20), default="days")  # days, hours
    
    # What to notify
    notify_assignee = Column(Boolean, default=True)
    notify_owner = Column(Boolean, default=False)
    notify_team_lead = Column(Boolean, default=False)
    notify_project_manager = Column(Boolean, default=False)
    notify_roles = Column(JSON, nullable=True)  # Specific roles to notify
    escalate_to_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    # Scope
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True)
    team_id = Column(String(36), ForeignKey("teams.id"), nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    escalate_to = relationship("User", backref="escalation_rules")
