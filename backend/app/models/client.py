import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, JSON, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base


class Client(Base):
    """Client model for managing organization clients."""
    __tablename__ = "clients"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    alias = Column(String(50), nullable=True)
    region = Column(String(100), nullable=True)
    business_sector = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    contact_numbers = Column(JSON, nullable=True)  # List of phone numbers (legacy)
    contacts = Column(JSON, nullable=True)  # Full contact objects: [{name, phone, type, isPrimary}]
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    projects = relationship("Project", back_populates="client")

