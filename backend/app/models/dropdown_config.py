"""Dynamic dropdown configuration model — stores per-org or system-wide dropdown options."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class DropdownConfig(Base):
    """Stores configurable dropdown options for any field across the application.
    
    category examples: task_status, task_priority, client_region, etc.
    organization_id=None means it is a system-wide default visible to all orgs.
    """
    __tablename__ = "dropdown_configs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=True, index=True)
    category = Column(String(100), nullable=False, index=True)
    key = Column(String(100), nullable=False)          # internal value e.g. "in_progress"
    label = Column(String(255), nullable=False)        # display label e.g. "In Progress"
    color = Column(String(50), nullable=True)          # hex/css color for badge
    icon = Column(String(50), nullable=True)           # lucide icon name
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)        # marks the system-seeded defaults
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization", backref="dropdown_configs")
