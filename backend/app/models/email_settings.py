"""Email settings and log models for email notifications."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Integer, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class EmailPreference(Base):
    """Extended email notification preferences for users."""
    __tablename__ = "email_preferences"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, unique=True)
    
    # Email notification types
    task_assignments = Column(Boolean, default=True)
    task_comments = Column(Boolean, default=True)
    task_mentions = Column(Boolean, default=True)
    task_due_reminders = Column(Boolean, default=True)
    task_overdue = Column(Boolean, default=True)
    project_updates = Column(Boolean, default=False)
    weekly_digest = Column(Boolean, default=True)
    daily_summary = Column(Boolean, default=False)
    approval_requests = Column(Boolean, default=True)
    system_alerts = Column(Boolean, default=True)
    
    # Reminder settings
    reminder_enabled = Column(Boolean, default=True)
    reminder_days_before = Column(JSON, default=[1, 3])  # Days before due date
    reminder_time = Column(String(10), default="09:00")  # HH:mm format
    reminder_timezone = Column(String(50), default="UTC")
    
    # Digest settings
    digest_enabled = Column(Boolean, default=True)
    digest_frequency = Column(String(20), default="weekly")  # daily, weekly, monthly
    digest_day_of_week = Column(Integer, default=1)  # 0-6 for weekly (0=Sunday)
    digest_day_of_month = Column(Integer, nullable=True)  # 1-31 for monthly
    digest_time = Column(String(10), default="08:00")
    digest_include_overdue = Column(Boolean, default=True)
    digest_include_upcoming = Column(Boolean, default=True)
    digest_include_completed = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="email_preferences")


class EmailLog(Base):
    """Log of sent emails for tracking and debugging."""
    __tablename__ = "email_logs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)  # May be null for system emails
    
    recipient_email = Column(String(255), nullable=False)
    recipient_name = Column(String(255), nullable=True)
    subject = Column(String(500), nullable=False)
    template_id = Column(String(100), nullable=True)
    
    # Email status
    status = Column(String(20), default="pending")  # pending, sent, failed, bounced
    sent_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Additional metadata
    metadata_json = Column(Text, nullable=True)  # Additional data as JSON
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="email_logs")


class TaskReminder(Base):
    """Scheduled task reminders."""
    __tablename__ = "task_reminders"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(String(36), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    reminder_date = Column(DateTime, nullable=False)
    message = Column(Text, nullable=True)
    
    is_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    task = relationship("Task", backref="reminders")
    user = relationship("User", backref="task_reminders")
