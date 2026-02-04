# Routers package
from app.routers import auth
from app.routers import users
from app.routers import clients
from app.routers import departments
from app.routers import projects
from app.routers import tasks
from app.routers import timesheets
from app.routers import expenses
from app.routers import support
from app.routers import dashboard
from app.routers import chatbot
from app.routers import expense_dashboard
from app.routers import expense_reports
from app.routers import cost_centers
# New routers
from app.routers import teams
from app.routers import workload
from app.routers import notifications
from app.routers import integrations
from app.routers import ai_features
from app.routers import views
from app.routers import email_notifications

__all__ = [
    "auth",
    "users",
    "clients",
    "departments",
    "projects",
    "tasks",
    "timesheets",
    "expenses",
    "support",
    "dashboard",
    "chatbot",
    "expense_dashboard",
    "expense_reports",
    "cost_centers",
    # New routers
    "teams",
    "workload",
    "notifications",
    "integrations",
    "ai_features",
    "views",
    "email_notifications",
]

