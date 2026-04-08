"""Custom field models — project-level field definitions + per-task values."""
import uuid, enum
from datetime import datetime
from sqlalchemy import Column, String, Text, Enum, ForeignKey, DateTime, JSON, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class FieldType(str, enum.Enum):
    text = "text"
    number = "number"
    date = "date"
    select = "select"
    multi_select = "multi_select"
    checkbox = "checkbox"
    url = "url"


class CustomFieldDefinition(Base):
    """Schema definition attached to a project."""
    __tablename__ = "custom_field_definitions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    field_type = Column(Enum(FieldType), nullable=False, default=FieldType.text)
    # JSON list of allowed values for select / multi_select
    options = Column(JSON, nullable=True)
    is_required = Column(Boolean, default=False)
    display_order = Column(String, default="0")
    created_at = Column(DateTime, default=datetime.utcnow)

    values = relationship("CustomFieldValue", back_populates="definition", cascade="all, delete-orphan")


class CustomFieldValue(Base):
    """Per-task value for a custom field."""
    __tablename__ = "custom_field_values"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(String, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    field_id = Column(String, ForeignKey("custom_field_definitions.id", ondelete="CASCADE"), nullable=False)
    value = Column(Text, nullable=True)  # always stored as text; UI converts to typed value
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    definition = relationship("CustomFieldDefinition", back_populates="values")
