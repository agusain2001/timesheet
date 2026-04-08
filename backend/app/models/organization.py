"""Organization model for multi-tenant support."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, Integer, func
from sqlalchemy.orm import relationship
from app.database import Base


class Organization(Base):
    """Organization model — top-level tenant for multi-tenancy."""
    __tablename__ = "organizations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=True)

    # Branding & Identity
    logo_url = Column(String(500), nullable=True)
    tax_id = Column(String(100), nullable=True)
    website = Column(String(500), nullable=True)
    industry = Column(String(100), nullable=True)

    # Address
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    zip_code = Column(String(20), nullable=True)

    # Contact
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)

    # Plan / Limits (for future packaging)
    subscription_plan = Column(String(50), default="free")
    max_users = Column(Integer, default=50)
    max_projects = Column(Integer, default=20)

    # Status
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    users = relationship("User", back_populates="organization")
    departments = relationship("Department", back_populates="organization")
    projects = relationship("Project", back_populates="organization")
    teams = relationship("Team", back_populates="organization")
    clients = relationship("Client", back_populates="organization")
