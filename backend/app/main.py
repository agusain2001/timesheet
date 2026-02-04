from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.config import get_settings
from app.database import engine, Base
from app.routers import (
    auth, users, clients, departments, projects, tasks, 
    timesheets, expenses, support, dashboard, chatbot,
    expense_dashboard, expense_reports, cost_centers, time_tracking
)
# New routers for Task & Project Management System
from app.routers import teams, workload, notifications, integrations, ai_features
# Phase 2: Calendar, Gantt, Reports, Search, Dashboards, WebSocket
from app.routers import (
    calendar, gantt, reports, search, 
    manager_dashboards, websocket_notifications
)
# Phase 3: Advanced Features, MFA
from app.routers import advanced_features, mfa
# Phase 4: Views and Email Notifications
from app.routers import views, email_notifications
# Phase 5: GDPR, Permissions, Google Calendar
from app.routers import gdpr, permissions, google_calendar
# OpenAPI documentation enhancement
from app.openapi_config import setup_custom_openapi

# Create database tables
Base.metadata.create_all(bind=engine)

# Get settings
settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title="LightIDEA Project Management API",
    description="Modern Timesheet, Project & Task Management API with AI-powered features",
    version="3.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Setup custom OpenAPI documentation
setup_custom_openapi(app)

# Configure CORS
origins = settings.cors_origins.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory if it doesn't exist
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
receipts_dir = uploads_dir / "receipts"
receipts_dir.mkdir(exist_ok=True)
attachments_dir = uploads_dir / "attachments"
attachments_dir.mkdir(exist_ok=True)

# Mount static files for uploaded files
app.mount("/api/uploads", StaticFiles(directory="uploads"), name="uploads")

# ========== Core Routers ==========
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(clients.router, prefix="/api/clients", tags=["Clients"])
app.include_router(departments.router, prefix="/api/departments", tags=["Departments"])

# ========== Project & Task Management ==========
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(teams.router, prefix="/api/teams", tags=["Teams"])
app.include_router(workload.router, prefix="/api/workload", tags=["Workload & Capacity"])

# ========== Time & Expense Management ==========
app.include_router(timesheets.router, prefix="/api/timesheets", tags=["Timesheets"])
app.include_router(time_tracking.router, prefix="/api/time-tracking", tags=["Time Tracking"])
app.include_router(expenses.router, prefix="/api/expenses", tags=["Expenses"])
app.include_router(expense_dashboard.router, prefix="/api/expenses/dashboard", tags=["Expense Dashboard"])
app.include_router(expense_reports.router, prefix="/api/expenses/reports", tags=["Expense Reports"])
app.include_router(cost_centers.router, prefix="/api/cost-centers", tags=["Cost Centers"])

# ========== Support & Communication ==========
app.include_router(support.router, prefix="/api/support", tags=["Support"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(chatbot.router, prefix="/api/chatbot", tags=["AI Chatbot"])

# ========== Dashboard & Analytics ==========
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])

# ========== Integrations & AI Features ==========
app.include_router(integrations.router, prefix="/api/integrations", tags=["Integrations & Webhooks"])
app.include_router(ai_features.router, prefix="/api/ai", tags=["AI Features"])

# ========== Calendar & Timeline Views ==========
app.include_router(calendar.router, prefix="/api/calendar", tags=["Calendar"])
app.include_router(gantt.router, prefix="/api/gantt", tags=["Gantt & Timeline"])

# ========== Reports & Analytics ==========
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(search.router, prefix="/api/search", tags=["Global Search"])
app.include_router(manager_dashboards.router, prefix="/api/dashboard", tags=["Manager & Executive Dashboards"])

# ========== Real-time Notifications ==========
app.include_router(websocket_notifications.router, tags=["WebSocket Notifications"])

# ========== Advanced Features ==========
app.include_router(advanced_features.router, prefix="/api/advanced", tags=["Advanced Features"])
app.include_router(mfa.router, prefix="/api/mfa", tags=["Multi-Factor Authentication"])

# ========== View Customization ==========
app.include_router(views.router, prefix="/api/views", tags=["Saved Views"])

# ========== Email Notifications ==========
app.include_router(email_notifications.router, prefix="/api/notifications/email", tags=["Email Notifications"])

# ========== GDPR & Privacy ==========
app.include_router(gdpr.router, prefix="/api/gdpr", tags=["GDPR Compliance"])

# ========== Permissions & RBAC ==========
app.include_router(permissions.router, prefix="/api", tags=["Permissions & Roles"])

# ========== Google Calendar Integration ==========
app.include_router(google_calendar.router, prefix="/api/integrations", tags=["Google Calendar"])


@app.get("/")
def root():
    return {
        "message": "TimeSheet & Project Management System API",
        "version": "3.0.0",
        "features": [
            "Task & Project Management",
            "Team Management",
            "Workload & Capacity Planning",
            "Time Tracking",
            "Expense Management",
            "AI-powered Features",
            "Webhooks & Integrations"
        ]
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
