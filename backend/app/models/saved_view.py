"""Saved View models for view customization."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class SavedView(Base):
    """User saved views for different view types."""
    __tablename__ = "saved_views"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    view_type = Column(String(50), nullable=False)  # list, kanban, timeline, calendar, swimlane
    
    is_default = Column(Boolean, default=False)
    is_shared = Column(Boolean, default=False)
    owner_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # View configuration stored as JSON
    columns_json = Column(Text, nullable=True)  # List of column configs
    filters_json = Column(Text, nullable=True)  # List of filter configs
    sorts_json = Column(Text, nullable=True)  # List of sort configs
    grouping_json = Column(Text, nullable=True)  # Grouping config
    color_by = Column(String(50), nullable=True)  # Field to color by
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owner = relationship("User", backref="saved_views")
    shares = relationship("ViewShare", back_populates="view", cascade="all, delete-orphan")


class ViewShare(Base):
    """Sharing configuration for saved views."""
    __tablename__ = "view_shares"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    view_id = Column(String(36), ForeignKey("saved_views.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    permission = Column(String(20), default="view")  # view, edit
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    view = relationship("SavedView", back_populates="shares")
    user = relationship("User", backref="shared_views")
