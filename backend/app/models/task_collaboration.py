"""Task collaboration models - Comments, Attachments, Assignees, and Audit Log."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Integer, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class TaskAssignee(Base):
    """Support for multiple assignees per task with different roles."""
    __tablename__ = "task_assignees"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(String(36), ForeignKey("tasks.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    role = Column(String(50), default="assignee")  # assignee, reviewer, watcher
    assigned_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    is_primary = Column(Boolean, default=False)
    
    # Relationships
    task = relationship("Task", back_populates="task_assignees")
    user = relationship("User", foreign_keys=[user_id], backref="task_assignments")
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])


class TaskComment(Base):
    """Comments on tasks with threading, mentions, and reactions."""
    __tablename__ = "task_comments"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(String(36), ForeignKey("tasks.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)  # Rich text/markdown content
    mentions = Column(JSON, nullable=True)  # Array of mentioned user IDs
    reactions = Column(JSON, nullable=True)  # {emoji: [user_ids]}
    parent_comment_id = Column(String(36), ForeignKey("task_comments.id"), nullable=True)  # Threading
    is_edited = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    task = relationship("Task", back_populates="comments")
    user = relationship("User", backref="task_comments")
    parent_comment = relationship("TaskComment", remote_side=[id], backref="replies")
    reactions = relationship("CommentReaction", back_populates="comment")


class TaskAttachment(Base):
    """File attachments for tasks with versioning support."""
    __tablename__ = "task_attachments"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(String(36), ForeignKey("tasks.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)  # Size in bytes
    mime_type = Column(String(100), nullable=True)
    version = Column(Integer, default=1)
    previous_version_id = Column(String(36), ForeignKey("task_attachments.id"), nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    task = relationship("Task", back_populates="attachments")
    user = relationship("User", backref="task_attachments")
    previous_version = relationship("TaskAttachment", remote_side=[id])


class TaskAuditLog(Base):
    """Audit trail for task changes."""
    __tablename__ = "task_audit_logs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(String(36), ForeignKey("tasks.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    action = Column(String(50), nullable=False)  # created, updated, status_changed, assigned, etc.
    field_name = Column(String(100), nullable=True)  # Which field was changed
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    extra_data = Column(JSON, nullable=True)  # Additional context
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    task = relationship("Task", back_populates="audit_logs")
    user = relationship("User", backref="task_audit_entries")
