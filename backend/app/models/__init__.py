"""Models package - Export all database models."""

# Import Base first
from app.database import Base

# Core models - import in order of dependencies
from app.models.user import User, UserRole, AvailabilityStatus
from app.models.department import Department, DepartmentManager
from app.models.client import Client

# Workspace and Team models (before project/task due to FK)
from app.models.workspace import Workspace, WorkspaceMember
from app.models.team import Team, TeamMember

# Project models
from app.models.project import Project, ProjectManager, ProjectStatus, ProjectPriority

# Project structure models
from app.models.project_structure import ProjectPhase, Epic, Milestone

# Task model
from app.models.task import Task, TaskType, TaskPriority, TaskStatus

# Task related models
from app.models.task_dependency import TaskDependency, DependencyType
from app.models.task_collaboration import TaskAssignee, TaskComment, TaskAttachment, TaskAuditLog

# Time tracking
from app.models.timesheet import Timesheet, TimeEntry, TimesheetStatus
from app.models.time_tracking import ActiveTimer, TimeLog, Capacity

# Expense models
from app.models.expense import Expense, ExpenseItem, ExpenseStatus
from app.models.expense_category import ExpenseCategory
from app.models.cost_center import CostCenter
from app.models.expense_approval import ExpenseApproval, ApprovalStatus
from app.models.expense_audit_log import ExpenseAuditLog
from app.models.approval_rule import ApprovalRule

# Support
from app.models.support import SupportRequest, SupportStatus

# Notification models
from app.models.notification import Notification, NotificationPreference, NotificationRule

# Automation models
from app.models.automation import AutomationRule, AutomationLog, TaskTemplate, ProjectTemplate

# Integration models
from app.models.integration import Integration, Webhook, WebhookLog, CalendarEvent, FileStorage

# Template and advanced feature models
from app.models.templates import (
    SavedFilter, CommentReaction, UserInvite, 
    ScheduledReport, MFASettings
)

# Saved Views models
from app.models.saved_view import SavedView, ViewShare

# Email Settings models
from app.models.email_settings import EmailPreference, EmailLog, TaskReminder


__all__ = [
    # Core
    "User", "UserRole", "AvailabilityStatus",
    "Department", "DepartmentManager",
    "Client",
    
    # Workspace and Team
    "Workspace", "WorkspaceMember",
    "Team", "TeamMember",
    
    # Project
    "Project", "ProjectManager", "ProjectStatus", "ProjectPriority",
    
    # Project Structure
    "ProjectPhase", "Epic", "Milestone",
    
    # Task
    "Task", "TaskType", "TaskPriority", "TaskStatus",
    
    # Task Collaboration
    "TaskDependency", "DependencyType",
    "TaskAssignee", "TaskComment", "TaskAttachment", "TaskAuditLog",
    
    # Time
    "Timesheet", "TimeEntry", "TimesheetStatus",
    "ActiveTimer", "TimeLog", "Capacity",
    
    # Expense
    "Expense", "ExpenseItem", "ExpenseStatus",
    "ExpenseCategory",
    "CostCenter",
    "ExpenseApproval", "ApprovalStatus",
    "ExpenseAuditLog",
    "ApprovalRule",
    
    # Support
    "SupportRequest", "SupportStatus",
    
    # Notifications
    "Notification", "NotificationPreference", "NotificationRule",
    
    # Automation
    "AutomationRule", "AutomationLog", "TaskTemplate", "ProjectTemplate",
    
    # Integrations
    "Integration", "Webhook", "WebhookLog", "CalendarEvent", "FileStorage",
    
    # Advanced Features
    "SavedFilter", "CommentReaction", "UserInvite", 
    "ScheduledReport", "MFASettings",
    
    # Saved Views
    "SavedView", "ViewShare",
    
    # Email Settings
    "EmailPreference", "EmailLog", "TaskReminder",
]

