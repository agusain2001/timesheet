"""Additional models for advanced features (filters, reactions, invites, reports, MFA)."""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.database import Base


class SavedFilter(Base):
    """User-saved search and view filters."""
    __tablename__ = "saved_filters"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    
    # Filter configuration
    entity_type = Column(String(50), nullable=False)  # task, project, user, etc.
    filter_config = Column(JSON, nullable=False)  # {status: [...], priority: [...], etc.}
    sort_config = Column(JSON, default=dict)  # {field: "created_at", order: "desc"}
    view_type = Column(String(50), default="list")  # list, kanban, calendar, etc.
    
    # Sharing
    is_shared = Column(String(10), default="false")
    share_token = Column(String(100), nullable=True)
    
    # Ownership
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="saved_filters")


class CommentReaction(Base):
    """Inline reactions on comments."""
    __tablename__ = "comment_reactions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    comment_id = Column(String(36), ForeignKey("task_comments.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    reaction = Column(String(50), nullable=False)  # emoji or reaction type
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    comment = relationship("TaskComment", back_populates="reactions")
    user = relationship("User", back_populates="comment_reactions")


class UserInvite(Base):
    """Email-based user invitations."""
    __tablename__ = "user_invites"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), nullable=False)
    token = Column(String(100), nullable=False, unique=True)
    
    # Invite details
    role = Column(String(50), default="contributor")
    team_id = Column(String(36), ForeignKey("teams.id"), nullable=True)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=True)
    
    # Status
    status = Column(String(20), default="pending")  # pending, accepted, expired
    expires_at = Column(DateTime, nullable=False)
    
    # Tracking
    invited_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    invited_by = relationship("User", back_populates="sent_invites")


class ScheduledReport(Base):
    """Scheduled report configuration."""
    __tablename__ = "scheduled_reports"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(200), nullable=False)
    
    # Report configuration
    report_type = Column(String(50), nullable=False)  # task_aging, completion_trends, etc.
    report_config = Column(JSON, default=dict)  # Filters and parameters
    export_format = Column(String(20), default="pdf")  # pdf, excel, csv
    
    # Schedule
    schedule_type = Column(String(20), nullable=False)  # daily, weekly, monthly
    schedule_day = Column(String(10), nullable=True)  # Day of week/month
    schedule_time = Column(String(10), default="09:00")  # Time of day
    
    # Recipients
    recipients = Column(JSON, default=list)  # [{email, user_id}]
    
    # Status
    is_active = Column(String(10), default="true")
    last_run_at = Column(DateTime, nullable=True)
    next_run_at = Column(DateTime, nullable=True)
    
    # Ownership
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    created_by = relationship("User", back_populates="scheduled_reports")


class MFASettings(Base):
    """Multi-factor authentication settings."""
    __tablename__ = "mfa_settings"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, unique=True)
    
    # TOTP settings
    secret_key = Column(String(100), nullable=True)
    is_enabled = Column(String(10), default="false")
    
    # Backup codes
    backup_codes = Column(JSON, default=list)
    
    # Verification
    verified_at = Column(DateTime, nullable=True)
    last_used_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="mfa_settings")
