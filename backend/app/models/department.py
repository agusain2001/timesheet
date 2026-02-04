import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Date, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class DepartmentManager(Base):
    """Association table for department managers with additional fields."""
    __tablename__ = "department_managers"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    is_primary = Column(Boolean, default=False)
    start_date = Column(Date, default=date.today)
    end_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    department = relationship("Department", back_populates="department_managers")
    user = relationship("User", backref="department_manager_roles")


class Department(Base):
    """Department model for organizational structure."""
    __tablename__ = "departments"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    employees = relationship("User", back_populates="department")
    department_managers = relationship("DepartmentManager", back_populates="department", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="department")
    tasks = relationship("Task", back_populates="department")
    
    @property
    def managers(self):
        """Get list of manager users."""
        return [dm.user for dm in self.department_managers]

