"""
URL routing for core API endpoints.

Uses DRF's DefaultRouter for automatic URL generation from ViewSets.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import UserViewSet, ProjectViewSet, TimesheetViewSet

# Create router and register viewsets
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'timesheets', TimesheetViewSet, basename='timesheet')

urlpatterns = [
    path('', include(router.urls)),
]
