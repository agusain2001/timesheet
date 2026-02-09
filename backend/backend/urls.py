"""
URL configuration for Timesheet & Project Management.

Routes all API endpoints through the core app.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
]
