"""
API & Security Layer for Timesheet & Project Management.

This module contains all REST API components including serializers,
viewsets, permissions, and exception handling. All HTTP request/response
logic is encapsulated here.

Components:
    - Serializers: Data validation and transformation
    - Permissions: Custom permission classes for access control
    - Mixins: Reusable functionality for exception handling
    - ViewSets: API endpoints with CRUD operations
"""
from __future__ import annotations

import logging
from typing import Any, Optional, Type

from django.db import transaction
from django.db.models import QuerySet
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException, ValidationError as DRFValidationError
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import exception_handler

from .models import (
    Project,
    ProjectStatus,
    Timesheet,
    TimesheetStatus,
    User,
    UserRole,
)

logger = logging.getLogger(__name__)


# =============================================================================
# CUSTOM EXCEPTION HANDLER
# =============================================================================

def custom_exception_handler(exc: Exception, context: dict) -> Optional[Response]:
    """
    Custom exception handler for standardized error responses.
    
    Wraps DRF's default exception handler to ensure all error responses
    follow a consistent JSON structure with 'error' and 'detail' fields.
    
    Args:
        exc: The raised exception
        context: Request context including view and request objects
        
    Returns:
        Response object with standardized error format
    """
    response = exception_handler(exc, context)
    
    if response is not None:
        # Standardize the error response format
        error_data = {
            'error': True,
            'status_code': response.status_code,
            'detail': response.data if isinstance(response.data, str) else response.data,
        }
        
        # Add error type for debugging
        error_data['error_type'] = exc.__class__.__name__
        
        response.data = error_data
    
    return response


# =============================================================================
# PERMISSIONS
# =============================================================================

class IsProjectManagerOrOwner(BasePermission):
    """
    Custom permission class for project-level access control.
    
    This permission enforces the following rules:
    - Admins have full access to all resources
    - Managers have full access to projects they manage
    - Employees can only view/edit their own resources
    
    For object-level permissions:
    - Project: Manager or admin can modify, members can view
    - Timesheet: Owner can edit (if draft), manager can approve
    """
    
    message = 'You do not have permission to perform this action.'
    
    def has_permission(self, request: Request, view: Any) -> bool:
        """
        Check if user has general permission to access the view.
        
        All authenticated users can access the API, but object-level
        permissions will further restrict access.
        """
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request: Request, view: Any, obj: Any) -> bool:
        """
        Check if user has permission to access a specific object.
        
        Args:
            request: The HTTP request
            view: The view being accessed
            obj: The object being accessed (Project, Timesheet, etc.)
            
        Returns:
            True if user has permission, False otherwise
        """
        user: User = request.user
        
        # Admins have full access
        if user.role == UserRole.ADMIN:
            return True
        
        # Handle Project objects
        if isinstance(obj, Project):
            # Managers can access projects they manage
            if user.role == UserRole.MANAGER and obj.manager == user:
                return True
            # Members can view their projects (read-only for safe methods)
            if request.method in ['GET', 'HEAD', 'OPTIONS']:
                return user in obj.members.all()
            return False
        
        # Handle Timesheet objects
        if isinstance(obj, Timesheet):
            # Owner can access their own timesheets
            if obj.user == user:
                # But can only modify if editable
                if request.method not in ['GET', 'HEAD', 'OPTIONS']:
                    return obj.is_editable
                return True
            # Project manager can access timesheets for their projects
            if user.role == UserRole.MANAGER and obj.project.manager == user:
                return True
            return False
        
        # Handle User objects (for profile access)
        if isinstance(obj, User):
            return obj == user or user.role in [UserRole.ADMIN, UserRole.MANAGER]
        
        return False


class IsAdminOrManager(BasePermission):
    """
    Permission class restricting access to admins and managers only.
    
    Used for administrative endpoints like user management and
    system-wide reporting.
    """
    
    message = 'Admin or Manager role required.'
    
    def has_permission(self, request: Request, view: Any) -> bool:
        """Check if user is admin or manager."""
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in [UserRole.ADMIN, UserRole.MANAGER]


# =============================================================================
# MIXINS
# =============================================================================

class SafeActionMixin:
    """
    Mixin providing standardized exception handling for ViewSets.
    
    Wraps all actions in try-except blocks to ensure consistent
    error responses and proper logging. All 4xx and 5xx errors
    return a standardized JSON structure.
    
    Usage:
        class MyViewSet(SafeActionMixin, viewsets.ModelViewSet):
            ...
    """
    
    def handle_exception(self, exc: Exception) -> Response:
        """
        Handle exceptions with standardized error response.
        
        Logs the exception and returns a properly formatted error response.
        Django validation errors are converted to 400 responses.
        
        Args:
            exc: The raised exception
            
        Returns:
            Response with standardized error format
        """
        # Log the exception for debugging
        logger.exception(
            f"Exception in {self.__class__.__name__}: {exc}",
            extra={'exception': exc}
        )
        
        # Convert Django ValidationError to DRF ValidationError
        from django.core.exceptions import ValidationError as DjangoValidationError
        if isinstance(exc, DjangoValidationError):
            exc = DRFValidationError(detail=exc.message_dict if hasattr(exc, 'message_dict') else str(exc))
        
        # Let DRF handle known exceptions
        if isinstance(exc, APIException):
            return super().handle_exception(exc)  # type: ignore
        
        # Handle unexpected exceptions
        return Response(
            {
                'error': True,
                'status_code': 500,
                'detail': 'An unexpected error occurred.',
                'error_type': 'InternalServerError',
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# =============================================================================
# SERIALIZERS
# =============================================================================

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model.
    
    Handles user data serialization with role-based field visibility.
    Password is write-only and properly hashed on creation/update.
    
    Attributes:
        full_name: Computed field combining first and last name
        can_approve: Computed field indicating approval permissions
    """
    
    full_name = serializers.SerializerMethodField(
        help_text='User full name'
    )
    can_approve = serializers.BooleanField(
        source='can_approve_timesheets',
        read_only=True,
        help_text='Whether user can approve timesheets'
    )
    password = serializers.CharField(
        write_only=True,
        required=False,
        min_length=8,
        help_text='User password (min 8 characters)'
    )
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'full_name', 'role', 'department', 'hourly_rate',
            'can_approve', 'is_active', 'date_joined', 'password',
        ]
        read_only_fields = ['id', 'date_joined', 'username']
        extra_kwargs = {
            'email': {'required': True},
            'hourly_rate': {'min_value': 0},
        }
    
    def get_full_name(self, obj: User) -> str:
        """Get user's full name or email if not set."""
        return obj.get_full_name() or obj.email
    
    def create(self, validated_data: dict) -> User:
        """
        Create user with proper password hashing.
        
        Uses the custom UserManager to ensure password is hashed.
        """
        password = validated_data.pop('password', None)
        user = User.objects.create_user(
            email=validated_data.pop('email'),
            password=password,
            **validated_data
        )
        return user
    
    def update(self, instance: User, validated_data: dict) -> User:
        """
        Update user with optional password change.
        
        Password is hashed if provided in the update data.
        """
        password = validated_data.pop('password', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
        
        instance.save()
        return instance


class ProjectSerializer(serializers.ModelSerializer):
    """
    Serializer for Project model.
    
    Includes computed fields for project statistics and
    nested representation of related users.
    
    Attributes:
        manager_name: Display name of project manager
        member_count: Number of assigned team members
        total_hours: Total approved hours logged
        budget_remaining: Remaining budget after logged costs
    """
    
    manager_name = serializers.SerializerMethodField(
        help_text='Project manager display name'
    )
    member_count = serializers.SerializerMethodField(
        help_text='Number of team members'
    )
    total_hours = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
        help_text='Total approved hours'
    )
    budget_remaining = serializers.DecimalField(
        max_digits=15,
        decimal_places=2,
        read_only=True,
        help_text='Remaining budget'
    )
    members = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.filter(is_active=True),
        required=False,
        help_text='List of member user IDs'
    )
    
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'client', 'budget', 'status',
            'manager', 'manager_name', 'members', 'member_count',
            'total_hours', 'budget_remaining', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'total_hours', 'budget_remaining']
    
    def get_manager_name(self, obj: Project) -> Optional[str]:
        """Get project manager's display name."""
        if obj.manager:
            return obj.manager.get_full_name() or obj.manager.email
        return None
    
    def get_member_count(self, obj: Project) -> int:
        """Get count of project members."""
        return obj.members.count()


class TimesheetSerializer(serializers.ModelSerializer):
    """
    Serializer for Timesheet model.
    
    Handles timesheet data with validation and computed fields.
    Duration and hours are calculated automatically from start/end times.
    
    Attributes:
        duration_display: Human-readable duration string
        hours: Duration in decimal hours
        user_name: Display name of timesheet owner
        project_name: Name of associated project
        is_editable: Whether timesheet can be modified
    """
    
    duration_display = serializers.SerializerMethodField(
        help_text='Human-readable duration'
    )
    hours = serializers.DecimalField(
        max_digits=6,
        decimal_places=2,
        read_only=True,
        help_text='Duration in hours'
    )
    user_name = serializers.SerializerMethodField(
        help_text='Owner display name'
    )
    project_name = serializers.SerializerMethodField(
        help_text='Project name'
    )
    is_editable = serializers.BooleanField(
        read_only=True,
        help_text='Whether timesheet can be edited'
    )
    
    class Meta:
        model = Timesheet
        fields = [
            'id', 'user', 'user_name', 'project', 'project_name',
            'start_time', 'end_time', 'duration_display', 'hours',
            'description', 'status', 'is_editable',
            'submitted_at', 'reviewed_by', 'reviewed_at', 'rejection_reason',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'user', 'status', 'submitted_at', 'reviewed_by',
            'reviewed_at', 'rejection_reason', 'created_at', 'updated_at',
        ]
    
    def get_duration_display(self, obj: Timesheet) -> str:
        """Format duration as 'Xh Ym' string."""
        duration = obj.duration
        hours, remainder = divmod(int(duration.total_seconds()), 3600)
        minutes = remainder // 60
        return f"{hours}h {minutes}m"
    
    def get_user_name(self, obj: Timesheet) -> str:
        """Get timesheet owner's display name."""
        return obj.user.get_full_name() or obj.user.email
    
    def get_project_name(self, obj: Timesheet) -> str:
        """Get associated project name."""
        return obj.project.name
    
    def validate(self, attrs: dict) -> dict:
        """
        Validate timesheet data.
        
        Ensures end_time is after start_time and project is active.
        """
        start_time = attrs.get('start_time')
        end_time = attrs.get('end_time')
        
        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({
                'end_time': 'End time must be after start time.'
            })
        
        project = attrs.get('project')
        if project and not project.is_active:
            raise serializers.ValidationError({
                'project': 'Cannot log time to inactive project.'
            })
        
        return attrs


class TimesheetApprovalSerializer(serializers.Serializer):
    """
    Serializer for timesheet approval/rejection actions.
    
    Used with the approve and reject endpoints to validate
    action-specific data.
    """
    
    action = serializers.ChoiceField(
        choices=['approve', 'reject'],
        help_text='Approval action to perform'
    )
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=1000,
        help_text='Rejection reason (required for reject action)'
    )
    
    def validate(self, attrs: dict) -> dict:
        """Validate that rejection includes a reason."""
        if attrs['action'] == 'reject' and not attrs.get('reason'):
            raise serializers.ValidationError({
                'reason': 'Reason is required when rejecting a timesheet.'
            })
        return attrs


# =============================================================================
# VIEWSETS
# =============================================================================

class UserViewSet(SafeActionMixin, viewsets.ModelViewSet):
    """
    ViewSet for User CRUD operations.
    
    Provides endpoints for managing users with role-based access control.
    Regular users can only view/update their own profile.
    Admins and managers can view all users.
    Only admins can create or delete users.
    
    Endpoints:
        GET /api/users/ - List users (filtered by role)
        POST /api/users/ - Create user (admin only)
        GET /api/users/{id}/ - Retrieve user
        PUT /api/users/{id}/ - Update user
        DELETE /api/users/{id}/ - Delete user (admin only)
        GET /api/users/me/ - Get current user profile
    """
    
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsProjectManagerOrOwner]
    http_method_names = ['get', 'post', 'put', 'patch', 'delete']
    
    def get_queryset(self) -> QuerySet[User]:
        """
        Filter users based on requester's role.
        
        Admins and managers see all active users.
        Employees only see themselves.
        """
        user: User = self.request.user
        
        if user.role in [UserRole.ADMIN, UserRole.MANAGER]:
            return User.objects.filter(is_active=True).order_by('email')
        
        return User.objects.filter(id=user.id)
    
    def get_permissions(self) -> list[BasePermission]:
        """
        Return appropriate permissions based on action.
        
        Create and delete actions require admin role.
        """
        if self.action in ['create', 'destroy']:
            return [IsAuthenticated(), IsAdminOrManager()]
        return super().get_permissions()
    
    @action(detail=False, methods=['get'])
    def me(self, request: Request) -> Response:
        """
        Get current authenticated user's profile.
        
        Returns:
            User profile data for the authenticated user
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)


class ProjectViewSet(SafeActionMixin, viewsets.ModelViewSet):
    """
    ViewSet for Project CRUD operations.
    
    Provides endpoints for managing projects with proper access control.
    Users can only see projects they have access to based on their role.
    
    Endpoints:
        GET /api/projects/ - List accessible projects
        POST /api/projects/ - Create project (manager/admin only)
        GET /api/projects/{id}/ - Retrieve project
        PUT /api/projects/{id}/ - Update project
        DELETE /api/projects/{id}/ - Delete project
        GET /api/projects/{id}/timesheets/ - List project timesheets
        POST /api/projects/{id}/add_member/ - Add member to project
        POST /api/projects/{id}/remove_member/ - Remove member from project
    """
    
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, IsProjectManagerOrOwner]
    http_method_names = ['get', 'post', 'put', 'patch', 'delete']
    
    def get_queryset(self) -> QuerySet[Project]:
        """
        Filter projects based on user access.
        
        Uses the custom ProjectManager method.
        """
        return Project.objects.get_for_user(self.request.user)
    
    def get_permissions(self) -> list[BasePermission]:
        """Create action requires manager/admin role."""
        if self.action == 'create':
            return [IsAuthenticated(), IsAdminOrManager()]
        return super().get_permissions()
    
    @action(detail=True, methods=['get'])
    def timesheets(self, request: Request, pk: Optional[str] = None) -> Response:
        """
        List all timesheets for a specific project.
        
        Managers see all timesheets, employees see only their own.
        """
        project = self.get_object()
        user: User = request.user
        
        if user.role in [UserRole.ADMIN, UserRole.MANAGER]:
            timesheets = project.timesheets.all()
        else:
            timesheets = project.timesheets.filter(user=user)
        
        serializer = TimesheetSerializer(timesheets, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def add_member(self, request: Request, pk: Optional[str] = None) -> Response:
        """
        Add a member to the project.
        
        Requires manager or admin permission.
        """
        project = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=user_id, is_active=True)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        project.members.add(user)
        return Response({'status': 'member added'})
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def remove_member(self, request: Request, pk: Optional[str] = None) -> Response:
        """
        Remove a member from the project.
        
        Requires manager or admin permission.
        """
        project = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        project.members.remove(user)
        return Response({'status': 'member removed'})


class TimesheetViewSet(SafeActionMixin, viewsets.ModelViewSet):
    """
    ViewSet for Timesheet CRUD operations.
    
    Provides endpoints for time tracking with approval workflow.
    Employees can create/edit their own timesheets.
    Managers can approve/reject timesheets for their projects.
    
    Endpoints:
        GET /api/timesheets/ - List user's timesheets
        POST /api/timesheets/ - Create timesheet
        GET /api/timesheets/{id}/ - Retrieve timesheet
        PUT /api/timesheets/{id}/ - Update timesheet (if editable)
        DELETE /api/timesheets/{id}/ - Delete timesheet (if editable)
        POST /api/timesheets/{id}/submit/ - Submit for approval
        POST /api/timesheets/{id}/approve/ - Approve timesheet
        POST /api/timesheets/{id}/reject/ - Reject timesheet
        GET /api/timesheets/pending/ - List pending approvals (managers)
    """
    
    serializer_class = TimesheetSerializer
    permission_classes = [IsAuthenticated, IsProjectManagerOrOwner]
    http_method_names = ['get', 'post', 'put', 'patch', 'delete']
    
    def get_queryset(self) -> QuerySet[Timesheet]:
        """
        Filter timesheets based on user role.
        
        Employees see only their own timesheets.
        Managers see timesheets for projects they manage.
        Admins see all timesheets.
        """
        user: User = self.request.user
        
        if user.role == UserRole.ADMIN:
            return Timesheet.objects.all().select_related('user', 'project')
        
        if user.role == UserRole.MANAGER:
            # Manager sees their own + projects they manage
            from django.db.models import Q
            return Timesheet.objects.filter(
                Q(user=user) | Q(project__manager=user)
            ).select_related('user', 'project').distinct()
        
        return Timesheet.objects.get_for_user(user)
    
    def perform_create(self, serializer: TimesheetSerializer) -> None:
        """
        Create timesheet with current user as owner.
        
        Automatically sets the user field to the authenticated user.
        """
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def submit(self, request: Request, pk: Optional[str] = None) -> Response:
        """
        Submit timesheet for approval.
        
        Transitions status from DRAFT to SUBMITTED.
        Only the timesheet owner can submit.
        """
        timesheet = self.get_object()
        
        if timesheet.user != request.user:
            return Response(
                {'error': 'Only the owner can submit a timesheet'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            timesheet.submit()
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(timesheet)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def approve(self, request: Request, pk: Optional[str] = None) -> Response:
        """
        Approve a submitted timesheet.
        
        Only managers of the project or admins can approve.
        Uses atomic transaction to ensure data consistency.
        """
        timesheet = self.get_object()
        user: User = request.user
        
        if not user.can_approve_timesheets:
            return Response(
                {'error': 'You do not have permission to approve timesheets'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if user is project manager or admin
        if user.role == UserRole.MANAGER and timesheet.project.manager != user:
            return Response(
                {'error': 'You can only approve timesheets for projects you manage'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            timesheet.approve(reviewer=user)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(timesheet)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def reject(self, request: Request, pk: Optional[str] = None) -> Response:
        """
        Reject a submitted timesheet.
        
        Requires a reason for rejection.
        Only managers of the project or admins can reject.
        """
        timesheet = self.get_object()
        user: User = request.user
        reason = request.data.get('reason', '')
        
        if not user.can_approve_timesheets:
            return Response(
                {'error': 'You do not have permission to reject timesheets'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if user.role == UserRole.MANAGER and timesheet.project.manager != user:
            return Response(
                {'error': 'You can only reject timesheets for projects you manage'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not reason:
            return Response(
                {'error': 'Reason is required when rejecting a timesheet'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            timesheet.reject(reviewer=user, reason=reason)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(timesheet)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def pending(self, request: Request) -> Response:
        """
        List all timesheets pending approval.
        
        For managers: shows pending timesheets for their projects.
        For admins: shows all pending timesheets.
        """
        user: User = request.user
        
        if not user.can_approve_timesheets:
            return Response(
                {'error': 'You do not have permission to view pending approvals'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if user.role == UserRole.ADMIN:
            timesheets = Timesheet.objects.get_all_pending()
        else:
            timesheets = Timesheet.objects.get_pending_approvals(user)
        
        serializer = self.get_serializer(timesheets, many=True)
        return Response(serializer.data)
