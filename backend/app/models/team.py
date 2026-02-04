"""Team model for hierarchical team structure."""
import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Text, Boolean, DateTime, Date, ForeignKey, Float, Integer, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class Team(Base):
    """Team model with hierarchical structure and capacity tracking."""
    __tablename__ = "teams"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    parent_team_id = Column(String(36), ForeignKey("teams.id"), nullable=True)  # Hierarchy
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True)
    lead_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    capacity_hours_week = Column(Float, default=40.0)
    color = Column(String(20), nullable=True)  # For UI display
    icon = Column(String(50), nullable=True)
    settings = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    parent_team = relationship("Team", remote_side=[id], backref="sub_teams")
    department = relationship("Department", backref="teams")
    lead = relationship("User", foreign_keys=[lead_id], backref="led_teams")
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="team")
    projects = relationship("Project", back_populates="team")


class TeamMember(Base):
    """Association table for team members with allocation tracking."""
    __tablename__ = "team_members"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    team_id = Column(String(36), ForeignKey("teams.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    role = Column(String(50), default="member")  # lead, member, contributor
    allocation_percentage = Column(Float, default=100.0)  # % time allocated to this team
    start_date = Column(Date, default=date.today)
    end_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    team = relationship("Team", back_populates="members")
    user = relationship("User", backref="team_memberships")
