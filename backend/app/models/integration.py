"""Integration models for external services - Email, Calendar, Webhooks."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Integer, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class Integration(Base):
    """External service integrations configuration."""
    __tablename__ = "integrations"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)  # email, calendar, storage, chat, webhook
    provider = Column(String(50), nullable=False)  # smtp, outlook, gmail, google_calendar, slack, etc.
    
    # Configuration
    config = Column(JSON, nullable=True)  # Provider-specific configuration
    credentials = Column(JSON, nullable=True)  # Encrypted credentials
    
    # Scope
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)  # User-specific integrations
    
    is_active = Column(Boolean, default=True)
    last_sync_at = Column(DateTime, nullable=True)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Webhook(Base):
    """Webhook configurations for external notifications."""
    __tablename__ = "webhooks"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    url = Column(String(500), nullable=False)
    secret = Column(String(255), nullable=True)  # For webhook signature verification
    
    # Event subscriptions
    events = Column(JSON, nullable=False)  # Array of event types to trigger on
    # Example: ["task.created", "task.completed", "project.updated"]
    
    # Scope
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True)
    
    # Configuration
    headers = Column(JSON, nullable=True)  # Custom headers to include
    retry_count = Column(Integer, default=3)
    timeout_seconds = Column(Integer, default=30)
    
    is_active = Column(Boolean, default=True)
    last_triggered_at = Column(DateTime, nullable=True)
    failure_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class WebhookLog(Base):
    """Log of webhook deliveries."""
    __tablename__ = "webhook_logs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    webhook_id = Column(String(36), ForeignKey("webhooks.id"), nullable=False)
    event_type = Column(String(50), nullable=False)
    payload = Column(JSON, nullable=True)
    
    # Response information
    status_code = Column(Integer, nullable=True)
    response_body = Column(Text, nullable=True)
    response_time_ms = Column(Integer, nullable=True)
    
    # Retry information
    attempt_number = Column(Integer, default=1)
    is_success = Column(Boolean, default=False)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    webhook = relationship("Webhook", backref="logs")


class CalendarEvent(Base):
    """Calendar events synced with external calendars."""
    __tablename__ = "calendar_events"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # Event details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    all_day = Column(Boolean, default=False)
    location = Column(String(500), nullable=True)
    
    # Linked entities
    task_id = Column(String(36), ForeignKey("tasks.id"), nullable=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True)
    milestone_id = Column(String(36), ForeignKey("milestones.id"), nullable=True)
    
    # External calendar sync
    external_id = Column(String(255), nullable=True)  # ID from external calendar
    external_provider = Column(String(50), nullable=True)  # google, outlook, etc.
    sync_status = Column(String(20), default="pending")  # pending, synced, failed
    last_synced_at = Column(DateTime, nullable=True)
    
    # Recurrence
    is_recurring = Column(Boolean, default=False)
    recurrence_rule = Column(String(255), nullable=True)  # RRULE format
    
    # Reminders
    reminders = Column(JSON, nullable=True)  # Array of reminder configurations
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="calendar_events")


class FileStorage(Base):
    """File storage configuration and tracking."""
    __tablename__ = "file_storage"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # File information
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    checksum = Column(String(64), nullable=True)  # SHA-256 hash
    
    # Storage provider
    provider = Column(String(50), default="local")  # local, s3, azure, gcs
    bucket = Column(String(255), nullable=True)
    external_url = Column(String(500), nullable=True)
    
    # Metadata
    uploaded_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=True)
    
    # Linked entity
    entity_type = Column(String(50), nullable=True)  # task, project, expense, etc.
    entity_id = Column(String(36), nullable=True)
    
    is_public = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    uploaded_by = relationship("User", backref="uploaded_files")
