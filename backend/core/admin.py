"""
Django Admin configuration for Timesheet & Project Management.

Registers all models with the Django admin site for easy management.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User, Project, Timesheet


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Custom User admin with role field visibility.
    """
    
    list_display = ['email', 'first_name', 'last_name', 'role', 'department', 'is_active']
    list_filter = ['role', 'is_active', 'is_staff', 'department']
    search_fields = ['email', 'first_name', 'last_name']
    ordering = ['email']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Role & Department', {
            'fields': ('role', 'department', 'hourly_rate'),
        }),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Role & Department', {
            'fields': ('role', 'department', 'hourly_rate'),
        }),
    )


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    """
    Project admin with member management.
    """
    
    list_display = ['name', 'client', 'status', 'manager', 'budget', 'created_at']
    list_filter = ['status', 'manager']
    search_fields = ['name', 'client', 'description']
    filter_horizontal = ['members']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Timesheet)
class TimesheetAdmin(admin.ModelAdmin):
    """
    Timesheet admin with approval workflow visibility.
    """
    
    list_display = ['user', 'project', 'start_time', 'end_time', 'status', 'reviewed_by']
    list_filter = ['status', 'project', 'user']
    search_fields = ['user__email', 'project__name', 'description']
    readonly_fields = ['submitted_at', 'reviewed_at', 'created_at', 'updated_at']
    date_hierarchy = 'start_time'
