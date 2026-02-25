from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.config import get_settings
from app.database import engine, Base, SessionLocal
from app.routers import (
    auth, users, clients, departments, projects, tasks, 
    timesheets, expenses, support, dashboard, chatbot,
    expense_dashboard, expense_reports, cost_centers, time_tracking,
    my_time
)
# New routers for Task & Project Management System
from app.routers import teams, workload, notifications, integrations, ai_features
# Phase 2: Calendar, Gantt, Reports, Search, Dashboards, WebSocket
from app.routers import (
    calendar, gantt, reports, search, 
    manager_dashboards, websocket_notifications
)
# Phase 3: Advanced Features, MFA
from app.routers import advanced_features, mfa, task_templates
# AI Agent (Agentic LLM with function calling)
from app.routers import ai_agent
# Phase 4: Views and Email Notifications
from app.routers import views, email_notifications
# Phase 5: GDPR, Permissions, Google Calendar, Project Structure, Workspaces
from app.routers import gdpr, permissions, google_calendar, project_structure, workspaces
# Settings
from app.routers import settings as settings_router
# Automation engine router
from app.routers import automation
# Chat integrations (Slack & Teams)
from app.routers import chat_integrations
# OpenAPI documentation enhancement
from app.openapi_config import setup_custom_openapi
from app.utils.error_handlers import register_error_handlers

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

# Register centralized error handlers
register_error_handlers(app)

# Rate Limiting
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
origins = settings.cors_origins.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)


# ─── Security Headers Middleware ──────────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses to prevent common attacks."""
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        # Prevent MIME-type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        # Control referrer information leakage
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Restrict browser features
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        # XSS protection (legacy browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        # HSTS for HTTPS
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        # Prevent caching of sensitive API responses
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            response.headers["Pragma"] = "no-cache"
        return response

app.add_middleware(SecurityHeadersMiddleware)

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
app.include_router(my_time.router, prefix="/api/my-time", tags=["My Time"])
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
app.include_router(ai_agent.router, prefix="/api/ai-agent", tags=["AI Agent"])


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

# ========== Task Templates ==========
app.include_router(task_templates.router, prefix="/api/task-templates", tags=["Task Templates"])

# ========== Email Notifications ==========
app.include_router(email_notifications.router, prefix="/api/notifications/email", tags=["Email Notifications"])

# ========== GDPR & Privacy ==========
app.include_router(gdpr.router, prefix="/api/gdpr", tags=["GDPR Compliance"])

# ========== Permissions & RBAC ==========
app.include_router(permissions.router, prefix="/api", tags=["Permissions & Roles"])

# ========== Google Calendar Integration ==========
app.include_router(google_calendar.router, prefix="/api/integrations", tags=["Google Calendar"])

# ========== Project Structure (Phases, Epics, Milestones) ==========
app.include_router(project_structure.router, prefix="/api", tags=["Project Structure"])

# ========== User Settings ==========
app.include_router(settings_router.router, prefix="/api/settings", tags=["Settings"])

# ========== Workspaces ==========
app.include_router(workspaces.router, prefix="/api/workspaces", tags=["Workspaces"])

# ========== Automation Rules Engine ==========
app.include_router(automation.router, prefix="/api/automation", tags=["Automation"])

# ========== Chat Integrations (Slack & Teams) ==========
app.include_router(chat_integrations.router, prefix="/api/integrations/chat", tags=["Chat Integrations"])


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
    """Health check with database connectivity verification."""
    try:
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "healthy", "database": "connected"}
    except Exception:
        return {"status": "degraded", "database": "disconnected"}
