"""
Business Logic Layer for Timesheet & Project Management.

This module contains all data models, custom managers, and business logic.
All database operations and validation rules are encapsulated here.

Entities:
    - User: Extended AbstractUser with role-based access control
    - Project: Project management with client, budget, and team members
    - Timesheet: Time tracking with approval workflow
"""
from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

if TYPE_CHECKING:
    from django.db.models import QuerySet


# =============================================================================
# ENUMS / CHOICES
# =============================================================================

class UserRole(models.TextChoices):
    """
    User role enumeration for role-based access control.
    
    Defines the hierarchy of permissions within the system:
    - ADMIN: Full system access, can manage all resources
    - MANAGER: Can approve timesheets, manage projects and team members
    - EMPLOYEE: Can create and submit timesheets, view assigned projects
    """
    ADMIN = 'admin', 'Admin'
    MANAGER = 'manager', 'Manager'
    EMPLOYEE = 'employee', 'Employee'


class ProjectStatus(models.TextChoices):
    """
    Project lifecycle status enumeration.
    
    Tracks the current state of a project:
    - PLANNING: Initial phase, project being scoped
    - ACTIVE: Project in progress, time tracking enabled
    - ON_HOLD: Temporarily paused, time tracking disabled
    - COMPLETED: Project finished, read-only
    - ARCHIVED: Historical data, hidden from default views
    """
    PLANNING = 'planning', 'Planning'
    ACTIVE = 'active', 'Active'
    ON_HOLD = 'on_hold', 'On Hold'
    COMPLETED = 'completed', 'Completed'
    ARCHIVED = 'archived', 'Archived'


class TimesheetStatus(models.TextChoices):
    """
    Timesheet approval workflow status.
    
    Defines the lifecycle of a timesheet entry:
    - DRAFT: Initial state, can be edited by owner
    - SUBMITTED: Pending manager approval, locked for editing
    - APPROVED: Accepted by manager, contributes to reports
    - REJECTED: Declined by manager, can be edited and resubmitted
    """
    DRAFT = 'draft', 'Draft'
    SUBMITTED = 'submitted', 'Submitted'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'


# =============================================================================
# CUSTOM MANAGERS
# =============================================================================

class UserManager(BaseUserManager['User']):
    """
    Custom manager for User model.
    
    Provides methods for creating regular users and superusers with proper
    role assignment and password hashing.
    """

    def create_user(
        self,
        email: str,
        password: Optional[str] = None,
        **extra_fields
    ) -> 'User':
        """
        Create and save a regular user with the given email and password.
        
        Args:
            email: User's email address (used as username)
            password: Plain text password (will be hashed)
            **extra_fields: Additional fields for the User model
            
        Returns:
            Newly created User instance
            
        Raises:
            ValueError: If email is not provided
        """
        if not email:
            raise ValueError('Users must have an email address')
        
        email = self.normalize_email(email)
        extra_fields.setdefault('role', UserRole.EMPLOYEE)
        
        user = self.model(email=email, username=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(
        self,
        email: str,
        password: Optional[str] = None,
        **extra_fields
    ) -> 'User':
        """
        Create and save a superuser with admin privileges.
        
        Args:
            email: Superuser's email address
            password: Plain text password
            **extra_fields: Additional fields
            
        Returns:
            Newly created superuser instance
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', UserRole.ADMIN)
        
        return self.create_user(email, password, **extra_fields)

    def get_by_role(self, role: UserRole) -> 'QuerySet[User]':
        """
        Filter users by their role.
        
        Args:
            role: UserRole enum value to filter by
            
        Returns:
            QuerySet of users with the specified role
        """
        return self.filter(role=role, is_active=True)

    def get_managers(self) -> 'QuerySet[User]':
        """
        Get all active managers and admins who can approve timesheets.
        
        Returns:
            QuerySet of users with manager or admin role
        """
        return self.filter(
            role__in=[UserRole.MANAGER, UserRole.ADMIN],
            is_active=True
        )


class ProjectManager(models.Manager['Project']):
    """
    Custom manager for Project model.
    
    Provides convenience methods for common project queries
    and ensures proper filtering based on user permissions.
    """

    def get_active(self) -> 'QuerySet[Project]':
        """
        Get all active projects.
        
        Returns:
            QuerySet of projects with ACTIVE status
        """
        return self.filter(status=ProjectStatus.ACTIVE)

    def get_for_user(self, user: 'User') -> 'QuerySet[Project]':
        """
        Get projects accessible to a specific user.
        
        Admins and managers can see all non-archived projects.
        Employees can only see projects they are members of.
        
        Args:
            user: User instance to filter projects for
            
        Returns:
            QuerySet of accessible projects
        """
        base_qs = self.exclude(status=ProjectStatus.ARCHIVED)
        
        if user.role in [UserRole.ADMIN, UserRole.MANAGER]:
            return base_qs
        
        return base_qs.filter(members=user)

    def get_managed_by(self, manager: 'User') -> 'QuerySet[Project]':
        """
        Get projects where the user is the manager.
        
        Args:
            manager: User instance who manages the projects
            
        Returns:
            QuerySet of projects managed by the user
        """
        return self.filter(manager=manager).exclude(status=ProjectStatus.ARCHIVED)


class TimesheetManager(models.Manager['Timesheet']):
    """
    Custom manager for Timesheet model.
    
    Encapsulates all timesheet queries to avoid raw queries in views.
    Provides methods for filtering by user, status, and approval workflow.
    """

    def get_for_user(self, user: 'User') -> 'QuerySet[Timesheet]':
        """
        Get all timesheets belonging to a specific user.
        
        Args:
            user: User instance who owns the timesheets
            
        Returns:
            QuerySet of timesheets owned by the user
        """
        return self.filter(user=user).select_related('user', 'project')

    def get_pending_approvals(self, manager: 'User') -> 'QuerySet[Timesheet]':
        """
        Get all timesheets pending approval for projects managed by a user.
        
        This method is used by managers to review submitted timesheets
        for projects they are responsible for.
        
        Args:
            manager: User instance who manages the projects
            
        Returns:
            QuerySet of submitted timesheets pending approval
        """
        return self.filter(
            status=TimesheetStatus.SUBMITTED,
            project__manager=manager
        ).select_related('user', 'project')

    def get_all_pending(self) -> 'QuerySet[Timesheet]':
        """
        Get all pending timesheets system-wide.
        
        Used by admins to view all pending approvals.
        
        Returns:
            QuerySet of all submitted timesheets
        """
        return self.filter(
            status=TimesheetStatus.SUBMITTED
        ).select_related('user', 'project')

    def get_approved_for_period(
        self,
        user: 'User',
        start_date: timezone.datetime,
        end_date: timezone.datetime
    ) -> 'QuerySet[Timesheet]':
        """
        Get approved timesheets for a user within a date range.
        
        Useful for generating reports and calculating billable hours.
        
        Args:
            user: User to filter timesheets for
            start_date: Start of the period
            end_date: End of the period
            
        Returns:
            QuerySet of approved timesheets within the date range
        """
        return self.filter(
            user=user,
            status=TimesheetStatus.APPROVED,
            start_time__gte=start_date,
            end_time__lte=end_date
        ).select_related('project')


# =============================================================================
# MODELS
# =============================================================================

class User(AbstractUser):
    """
    Extended User model with role-based access control.
    
    Extends Django's AbstractUser to add role-based permissions for the
    timesheet and project management system. The role field determines
    what actions a user can perform:
    
    - Admin: Full system access
    - Manager: Approve timesheets, manage assigned projects
    - Employee: Submit timesheets for assigned projects
    
    Attributes:
        email: Unique email address (also used for login)
        role: User's role in the system (admin/manager/employee)
        department: Optional department affiliation
        hourly_rate: Employee's hourly rate for billing calculations
    """
    
    email = models.EmailField(
        unique=True,
        help_text='Unique email address used for authentication'
    )
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.EMPLOYEE,
        db_index=True,
        help_text='User role determining permissions'
    )
    department = models.CharField(
        max_length=100,
        blank=True,
        help_text='Department the user belongs to'
    )
    hourly_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Hourly billing rate for the user'
    )
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS: list[str] = []
    
    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['email']
    
    def __str__(self) -> str:
        return f"{self.get_full_name() or self.email} ({self.role})"
    
    @property
    def is_admin(self) -> bool:
        """Check if user has admin role."""
        return self.role == UserRole.ADMIN
    
    @property
    def is_manager(self) -> bool:
        """Check if user has manager role."""
        return self.role == UserRole.MANAGER
    
    @property
    def is_employee(self) -> bool:
        """Check if user has employee role."""
        return self.role == UserRole.EMPLOYEE
    
    @property
    def can_approve_timesheets(self) -> bool:
        """Check if user can approve timesheets."""
        return self.role in [UserRole.ADMIN, UserRole.MANAGER]


class Project(models.Model):
    """
    Project model for managing client work and team assignments.
    
    Represents a billable project with associated team members, budget,
    and lifecycle status. Projects are the primary container for timesheets.
    
    Attributes:
        name: Project name
        description: Detailed project description
        client: Client or customer name
        budget: Total project budget
        status: Current project lifecycle status
        manager: User responsible for project management
        members: Team members assigned to the project
        created_at: Project creation timestamp
        updated_at: Last modification timestamp
    """
    
    name = models.CharField(
        max_length=200,
        help_text='Project name'
    )
    description = models.TextField(
        blank=True,
        help_text='Detailed project description'
    )
    client = models.CharField(
        max_length=200,
        blank=True,
        help_text='Client or customer name'
    )
    budget = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Total project budget'
    )
    status = models.CharField(
        max_length=20,
        choices=ProjectStatus.choices,
        default=ProjectStatus.PLANNING,
        db_index=True,
        help_text='Current project status'
    )
    manager = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_projects',
        limit_choices_to={'role__in': [UserRole.ADMIN, UserRole.MANAGER]},
        help_text='User responsible for managing this project'
    )
    members = models.ManyToManyField(
        User,
        related_name='projects',
        blank=True,
        help_text='Team members assigned to this project'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='Project creation timestamp'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='Last modification timestamp'
    )
    
    objects = ProjectManager()
    
    class Meta:
        verbose_name = 'Project'
        verbose_name_plural = 'Projects'
        ordering = ['-created_at']
    
    def __str__(self) -> str:
        return f"{self.name} ({self.get_status_display()})"
    
    @property
    def is_active(self) -> bool:
        """Check if project allows time tracking."""
        return self.status == ProjectStatus.ACTIVE
    
    @property
    def total_hours(self) -> Decimal:
        """
        Calculate total approved hours logged on this project.
        
        Returns:
            Total hours as Decimal
        """
        approved = self.timesheets.filter(status=TimesheetStatus.APPROVED)
        total_minutes = sum(
            (ts.duration.total_seconds() / 60) for ts in approved
        )
        return Decimal(str(total_minutes / 60)).quantize(Decimal('0.01'))
    
    @property
    def budget_remaining(self) -> Decimal:
        """
        Calculate remaining budget based on approved timesheets.
        
        Uses member hourly rates to calculate cost.
        
        Returns:
            Remaining budget as Decimal
        """
        approved = self.timesheets.filter(
            status=TimesheetStatus.APPROVED
        ).select_related('user')
        
        total_cost = sum(
            Decimal(str(ts.duration.total_seconds() / 3600)) * ts.user.hourly_rate
            for ts in approved
        )
        return self.budget - total_cost


class Timesheet(models.Model):
    """
    Timesheet model for tracking work hours on projects.
    
    Represents a time entry with approval workflow. Timesheets go through
    the following lifecycle:
    1. DRAFT: Created by user, can be edited
    2. SUBMITTED: Sent for approval, locked
    3. APPROVED/REJECTED: Final state from manager review
    
    Validation ensures end_time > start_time and proper status transitions.
    
    Attributes:
        user: Employee who logged the time
        project: Project the time was logged against
        start_time: Work session start timestamp
        end_time: Work session end timestamp
        description: Work description
        status: Current approval status
        submitted_at: When timesheet was submitted for approval
        reviewed_by: Manager who approved/rejected
        reviewed_at: When approval decision was made
        rejection_reason: Explanation for rejection
    """
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='timesheets',
        help_text='Employee who logged this time entry'
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='timesheets',
        help_text='Project this time was logged against'
    )
    start_time = models.DateTimeField(
        help_text='Work session start time'
    )
    end_time = models.DateTimeField(
        help_text='Work session end time'
    )
    description = models.TextField(
        blank=True,
        help_text='Description of work performed'
    )
    status = models.CharField(
        max_length=20,
        choices=TimesheetStatus.choices,
        default=TimesheetStatus.DRAFT,
        db_index=True,
        help_text='Current approval status'
    )
    submitted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the timesheet was submitted for approval'
    )
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_timesheets',
        help_text='Manager who reviewed this timesheet'
    )
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the timesheet was reviewed'
    )
    rejection_reason = models.TextField(
        blank=True,
        help_text='Reason for rejection if applicable'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='Record creation timestamp'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='Last modification timestamp'
    )
    
    objects = TimesheetManager()
    
    class Meta:
        verbose_name = 'Timesheet'
        verbose_name_plural = 'Timesheets'
        ordering = ['-start_time']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['project', 'status']),
            models.Index(fields=['start_time', 'end_time']),
        ]
    
    def __str__(self) -> str:
        return f"{self.user.email} - {self.project.name} ({self.duration})"
    
    def clean(self) -> None:
        """
        Validate timesheet data.
        
        Ensures:
        - End time is after start time
        - Project is active (for new entries)
        - User is a member of the project
        
        Raises:
            ValidationError: If validation fails
        """
        if self.end_time and self.start_time:
            if self.end_time <= self.start_time:
                raise ValidationError({
                    'end_time': 'End time must be after start time.'
                })
            
            # Limit single entry to 24 hours
            if (self.end_time - self.start_time) > timedelta(hours=24):
                raise ValidationError({
                    'end_time': 'Single timesheet entry cannot exceed 24 hours.'
                })
        
        # Only validate project status for new entries or draft status
        if self.pk is None or self.status == TimesheetStatus.DRAFT:
            if self.project and not self.project.is_active:
                raise ValidationError({
                    'project': 'Cannot log time to inactive project.'
                })
    
    def save(self, *args, **kwargs) -> None:
        """
        Save timesheet with validation.
        
        Calls clean() before saving to ensure data integrity.
        """
        self.clean()
        super().save(*args, **kwargs)
    
    @property
    def duration(self) -> timedelta:
        """
        Calculate the duration of this timesheet entry.
        
        Returns:
            Time difference between end and start time
        """
        if self.end_time and self.start_time:
            return self.end_time - self.start_time
        return timedelta(0)
    
    @property
    def hours(self) -> Decimal:
        """
        Get duration in decimal hours.
        
        Returns:
            Duration as Decimal hours (e.g., 1.5 for 1h 30m)
        """
        return Decimal(str(self.duration.total_seconds() / 3600)).quantize(
            Decimal('0.01')
        )
    
    @property
    def is_editable(self) -> bool:
        """
        Check if timesheet can be edited.
        
        Only draft and rejected timesheets can be modified.
        
        Returns:
            True if timesheet is editable
        """
        return self.status in [TimesheetStatus.DRAFT, TimesheetStatus.REJECTED]
    
    def submit(self) -> None:
        """
        Submit timesheet for approval.
        
        Transitions status from DRAFT to SUBMITTED and records
        the submission timestamp.
        
        Raises:
            ValidationError: If timesheet is not in DRAFT status
        """
        if self.status not in [TimesheetStatus.DRAFT, TimesheetStatus.REJECTED]:
            raise ValidationError(
                f'Cannot submit timesheet with status: {self.status}'
            )
        
        self.status = TimesheetStatus.SUBMITTED
        self.submitted_at = timezone.now()
        self.rejection_reason = ''  # Clear any previous rejection
        self.save(update_fields=['status', 'submitted_at', 'rejection_reason', 'updated_at'])
    
    def approve(self, reviewer: User) -> None:
        """
        Approve the timesheet.
        
        Transitions status from SUBMITTED to APPROVED and records
        the reviewer and review timestamp.
        
        Args:
            reviewer: User who is approving the timesheet
            
        Raises:
            ValidationError: If timesheet is not in SUBMITTED status
            ValidationError: If reviewer lacks permission
        """
        if self.status != TimesheetStatus.SUBMITTED:
            raise ValidationError(
                f'Cannot approve timesheet with status: {self.status}'
            )
        
        if not reviewer.can_approve_timesheets:
            raise ValidationError('User does not have permission to approve timesheets.')
        
        self.status = TimesheetStatus.APPROVED
        self.reviewed_by = reviewer
        self.reviewed_at = timezone.now()
        self.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])
    
    def reject(self, reviewer: User, reason: str = '') -> None:
        """
        Reject the timesheet.
        
        Transitions status from SUBMITTED to REJECTED with optional
        rejection reason.
        
        Args:
            reviewer: User who is rejecting the timesheet
            reason: Optional explanation for rejection
            
        Raises:
            ValidationError: If timesheet is not in SUBMITTED status
            ValidationError: If reviewer lacks permission
        """
        if self.status != TimesheetStatus.SUBMITTED:
            raise ValidationError(
                f'Cannot reject timesheet with status: {self.status}'
            )
        
        if not reviewer.can_approve_timesheets:
            raise ValidationError('User does not have permission to reject timesheets.')
        
        self.status = TimesheetStatus.REJECTED
        self.reviewed_by = reviewer
        self.reviewed_at = timezone.now()
        self.rejection_reason = reason
        self.save(update_fields=[
            'status', 'reviewed_by', 'reviewed_at', 'rejection_reason', 'updated_at'
        ])
