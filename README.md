<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15+-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/FastAPI-0.109+-green?style=for-the-badge&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Python-3.10+-blue?style=for-the-badge&logo=python" alt="Python" />
  <img src="https://img.shields.io/badge/Google_Gemini-2.5-orange?style=for-the-badge&logo=google" alt="Gemini AI" />
  <img src="https://img.shields.io/badge/Security-Hardened-red?style=for-the-badge&logo=shield" alt="Security" />
</p>

<h1 align="center">⏱️ LightIDEA — Enterprise Project & Time Management Platform</h1>

<p align="center">
  <strong>A full-stack, AI-powered, enterprise-grade project management system built for modern teams.<br>
  Real-time collaboration • Smart automation • GDPR-compliant • Role-based access control</strong>
</p>

<p align="center">
  <a href="#-overview">Overview</a> •
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-project-structure">Structure</a> •
  <a href="#-api-reference">API Reference</a> •
  <a href="#-security">Security</a> •
  <a href="#-tech-stack">Tech Stack</a>
</p>

---

## 📋 Overview

**LightIDEA** is a comprehensive enterprise platform that unifies time tracking, project management, expense management, and team collaboration into a single, cohesive system. It is powered by **Google Gemini AI** for intelligent automation and provides a beautiful, fully-responsive UI with dark and light themes.

### Why LightIDEA?

| Problem | LightIDEA Solution |
|---------|-------------------|
| Scattered tools (Jira + Toggl + Expensify + Slack) | Single unified platform |
| Manual reporting consuming hours | AI-generated reports in seconds |
| No visibility into actual work hours | Real-time time tracking with analytics |
| Complex approval chains | Configurable multi-level workflow engine |
| Data security concerns | Hardened: rate limiting, MFA, RBAC, encryption, GDPR |
| Generic dashboards | Role-specific dashboards (Employee / Manager / Executive) |

---

## ✨ Features

### 🔐 Authentication & Identity

- **Email/Password login** with bcrypt hashing (10 rounds)
- **OAuth 2.0** via Google and Microsoft (uses URL fragment for token safety)
- **Multi-Factor Authentication (MFA)** with TOTP — setup, verify, backup codes, disable
- **JWT tokens** with configurable expiry and `/api/auth/refresh` endpoint
- **Role-Based Access Control (RBAC):** Admin, Manager, Lead, Employee roles with fine-grained permission guards
- **Session management** via secure `SameSite=Strict; Secure` cookies
- **Password validation:** minimum 8 chars, uppercase, lowercase, digit required on registration

### 👥 User & Team Management

- **User CRUD** — create, read, update, delete with admin-only guards
- **Self-delete protection** — admins cannot delete themselves or the last admin
- **Profile management** — extended fields (bio, phone, avatar, timezone, language)
- **Department hierarchy** — users assigned to departments with managers
- **Team management** — create teams, assign members, define roles per team
- **Workload & capacity planning** — see utilization rates per user and team
- **Employee export** — export selected users to CSV
- **Profile activity** summary — tasks, timesheets, expenses per user

### 🏢 Client & Cost Center Management

- Full CRUD for **clients** with contact info, billing details, status
- **Cost centers** — allocate expenses and time to business units
- Link projects and expenses directly to clients and cost centers

### 📋 Project Management

- **Project CRUD** with status tracking (Planning → Active → On Hold → Completed → Archived)
- **Project Phases** — break projects into logical phases with dates and milestones
- **Epics** — group related tasks under epics within phases
- **Milestones** — track key delivery points with completion status
- **Project-level Settings** — budget, currency, priority, team assignment
- **Project Portfolio** — see all projects across the organization at a glance

### ✅ Advanced Task Management

- **Task CRUD** with rich metadata — title, description, priority, status, due dates, tags, custom fields
- **Task Statuses:** Todo → In Progress → In Review → Blocked → Done → Cancelled
- **Task Priorities:** Critical, High, Medium, Low, Urgent
- **Multiple Views:**
  - 📋 **List View** — sortable, filterable table
  - 📌 **Kanban Board** — drag-and-drop across status columns
  - 🏊 **Swimlane View** — organized by assignee or priority
  - 📅 **Calendar View** — tasks on a calendar grid
  - 📊 **Gantt View** — timeline with dependencies visualization
- **Task Dependencies** — finish-to-start blocking relationships with cycle detection
- **File Attachments** — upload and manage files per task
- **Task Templates** — save and reuse task configurations
- **Automation Engine** — rule-based automated actions (e.g., auto-assign when status changes)
- **Bulk Actions** — update multiple tasks simultaneously
- **Sub-Tasks** — nested task hierarchy
- **@Mentions & Comments** — real-time collaboration within tasks
- **SLA Tracking** — automated SLA breach detection and escalation

### ⏰ Time Tracking

- **Manual Timesheet Entry** — log hours against projects and tasks (draft → submit → approve)
- **Live Time Tracking** — start/pause/stop timers from the task or "My Time" view
- **My Time view** — personal time log with filtering by date, project, status
- **Approval Workflow** — managers approve/reject submitted timesheets
- **Excel Export** — export timesheets with formatting
- **Capacity Planning** — compare allocated hours vs. actual logged hours per team member
- **Workload Dashboard** — heatmap and utilization charts per employee

### 💰 Expense Management

- **Expense submission** — multi-item expenses with categories (travel, meals, accommodation, supplies, etc.)
- **Receipt Upload** — attach image/PDF receipts per expense
- **Multi-level Approval Workflow:** Draft → Submitted → Approved → Paid / Rejected
- **Approval actions:** approve, reject, request revision, mark as paid
- **Audit Log** — full change history for every expense
- **Expense Dashboard** — charts for totals by category, status, department, date range
- **Budget tracking** — compare actual vs. budgeted amounts
- **Reporting:**
  - Excel and PDF export of expense reports with filters (date range, user, department, status)
  - Tax report export by year
  - Audit log export with date range filtering
- **Cost center allocation** — link expenses to business units

### 📊 Dashboards & Analytics

**Three role-aware dashboards:**

**Employee Dashboard:**
- My active tasks, overdue tasks, completed this week
- Hours logged this week vs. target
- Pending expense approvals
- Upcoming deadlines (next 7 days)
- Recent activity feed

**Manager Dashboard:**
- Team utilization and capacity
- Team task completion rates
- Pending approvals queue (timesheets + expenses)
- Project health overview
- SLA compliance metrics

**Executive Dashboard:**
- Company-wide KPIs
- Revenue vs. budget tracking
- Project portfolio status (on-track / at-risk / delayed)
- Resource utilization across departments
- Trend analysis charts (week-over-week, month-over-month)

### 🤖 AI Features (Google Gemini 2.5)

**Conversational AI Chatbot:**
- Natural language queries: *"What are my overdue tasks this week?"*
- Context-aware responses using live database data
- Multi-turn conversations with history
- File analysis (upload PDFs, images of receipts for extraction)
- Prompt injection protection and input sanitization
- Rate-limited to prevent abuse

**AI Task Intelligence:**
- **Deadline Prediction** — estimates completion time based on task complexity and team velocity
- **Smart Prioritization** — AI-recommended task ordering
- **Assignee Suggestions** — recommends the best team member based on skills and workload
- **Effort Estimation** — predicts story points / hours for new tasks
- **Risk Detection** — flags tasks/projects trending towards SLA breach
- **AI Agent** — function-calling agent that can create tasks, update statuses, query data via natural language

### 🔔 Notifications

- **In-app WebSocket notifications** — real-time push, no polling needed
- **Email notifications** — configurable triggers (task assignment, deadline, approval, mention)
- **Notification templates** — customizable email templates per event type
- **Notification preferences** — per-user control over channels (in-app/email) per event type
- **Digest emails** — daily/weekly notification summaries
- **Notification Center** — inbox with mark-as-read, filter, delete

### 📅 Calendar & Timeline

- **Calendar View** — tasks and events on a monthly/weekly grid
- **Google Calendar Sync** — bidirectional sync of tasks as calendar events via OAuth
- **Gantt Charts** — interactive project timelines with dependency lines and progress bars
- **Timeline View** — resource-aware cross-project timeline

### 📈 Reporting

- **Standard Reports:** Project Status, Time Summary, Expense Report, Team Performance
- **Custom Report Builder** — define custom data queries and groupings
- **Scheduled Reports** — set up recurring reports delivered by email
- **Export Formats:** Excel (.xlsx), PDF, CSV
- **Gantt Export:** Timeline data in structured format for visualization
- **Tax Reports** — annual expense report for accounting purposes

### 🔍 Global Search

- Full-text search across Users, Projects, Tasks, Clients, Teams, Expenses, Timesheets, Support Tickets
- **Search Suggestions** — live dropdown suggestions as you type
- **Faceted Filtering** — filter results by entity type, date, status
- **Recent Searches** — remembers your last queries

### 🎛️ Workspaces

- **Multi-workspace support** — create isolated environments (e.g., per client or business unit)
- Workspace-scoped members, projects, and settings

### 🎫 Support Ticket System

- **Ticket submission** — title, description, priority, category
- **Ticket management** — status workflow (Open → In Progress → Resolved → Closed)
- **Assignment** — assign tickets to support team members
- **Full-text search** across ticket history

### ⚙️ Automation Engine

- **Rule-based automations** — "When [trigger] then [action]"
- Triggers: task created, status changed, due date reached, user assigned
- Actions: send notification, change status, assign user, create subtask, trigger webhook

### 🔗 Integrations & Webhooks

- **Google Calendar** — OAuth sync of tasks as events
- **Slack** — send notifications to channels via webhook
- **Microsoft Teams** — send notifications to Teams channels
- **Custom Webhooks** — HTTP POST events with HMAC signature verification
- **Webhook Event Log** — see delivery status, retry failures
- **API Integrations** — generic REST integrations with API key auth

### 🛡️ GDPR & Privacy

- **Data Export** — download all personal data as JSON
- **Right to Erasure** — delete account and all associated data
- **Consent Management** — track and update user consent preferences
- **Privacy Settings** — control what data is collected and shared

### 👁️ Custom Views

- **Saved Views** — save filter+sort combinations as named views
- **Shared Views** — share views with team members
- Views work across Tasks, Projects, Timesheets, and Expenses

### 🎨 UI & Experience

- **Dark / Light mode** with smooth transitions
- **Glassmorphism design** with gradient accents
- **Mobile-responsive** layouts
- **Accessible** with keyboard navigation support
- **Theme-aware** components that adapt to system preference

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and **npm** 9+
- **Python** 3.10+
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/agusain2001/timesheet.git
cd timesheet
```

### 2. Backend Setup

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Generate a secure secret key
python -c "import secrets; print(secrets.token_hex(64))"

# Set up environment file
# Edit .env with your values (see Environment Variables section)
copy .env.example .env    # Windows
# cp .env.example .env    # macOS/Linux

# Start the backend server
python -m uvicorn app.main:app --reload --port 8000
```

Backend: **http://localhost:8000**  
API Docs: **http://localhost:8000/api/docs**

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
# Create .env.local with: NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Frontend: **http://localhost:3000**

### 4. First Admin User

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "Admin@1234",
    "confirm_password": "Admin@1234",
    "full_name": "System Admin"
  }'
```

> The first registered user should be manually promoted to `admin` role in the database.

---

## 🔧 Environment Variables

### Backend `.env`

```env
# Database
DATABASE_URL=sqlite:///./timesheet.db
# For PostgreSQL: postgresql://user:pass@localhost:5432/lightidea

# JWT — generate with: python -c "import secrets; print(secrets.token_hex(64))"
SECRET_KEY=your-128-char-random-hex-here
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key-here

# CORS (comma-separated)
CORS_ORIGINS=http://localhost:3000

# Encryption for sensitive fields (optional but recommended)
# Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY=

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
```

### Frontend `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 📁 Project Structure

```
LightIDEA/
├── 📂 backend/
│   ├── 📂 app/
│   │   ├── main.py                   # FastAPI app entry, middleware, router registration
│   │   ├── config.py                 # Settings with startup validation
│   │   ├── database.py               # SQLAlchemy engine, session, Base
│   │   ├── 📂 routers/ (42 files)    # API endpoints
│   │   │   ├── auth.py               # Auth: register, login, OAuth, MFA, refresh
│   │   │   ├── users.py              # User CRUD, profile, export
│   │   │   ├── projects.py           # Project CRUD
│   │   │   ├── project_structure.py  # Phases, epics, milestones
│   │   │   ├── tasks.py              # Tasks: CRUD, attachments, dependencies
│   │   │   ├── task_templates.py     # Task templates
│   │   │   ├── teams.py              # Team management
│   │   │   ├── clients.py            # Client management
│   │   │   ├── departments.py        # Department hierarchy
│   │   │   ├── timesheets.py         # Timesheet submission, approval, export
│   │   │   ├── time_tracking.py      # Live timer: start, stop, pause
│   │   │   ├── my_time.py            # Personal time log view
│   │   │   ├── expenses.py           # Expense CRUD, approval workflow
│   │   │   ├── expense_dashboard.py  # Expense analytics
│   │   │   ├── expense_reports.py    # Expense Excel/PDF export, tax reports
│   │   │   ├── cost_centers.py       # Cost center management
│   │   │   ├── dashboard.py          # Employee/personal dashboard
│   │   │   ├── manager_dashboards.py # Manager + executive dashboards
│   │   │   ├── chatbot.py            # Gemini AI chatbot + file analysis
│   │   │   ├── ai_features.py        # AI task intelligence (predict, prioritize)
│   │   │   ├── ai_agent.py           # Agentic AI with function calling
│   │   │   ├── notifications.py      # In-app notification CRUD
│   │   │   ├── email_notifications.py# Email templates and send
│   │   │   ├── websocket_notifications.py # WebSocket real-time push
│   │   │   ├── calendar.py           # Internal calendar view data
│   │   │   ├── google_calendar.py    # Google Calendar OAuth sync
│   │   │   ├── gantt.py              # Gantt chart data
│   │   │   ├── reports.py            # Report generation, scheduling
│   │   │   ├── search.py             # Global search + suggestions
│   │   │   ├── views.py              # Custom saved views
│   │   │   ├── workload.py           # Workload capacity planning
│   │   │   ├── workspaces.py         # Multi-workspace management
│   │   │   ├── support.py            # Support ticket system
│   │   │   ├── integrations.py       # Webhooks + external integrations
│   │   │   ├── chat_integrations.py  # Slack/Teams notification delivery
│   │   │   ├── automation.py         # Automation rules engine
│   │   │   ├── advanced_features.py  # Bulk import, advanced ops
│   │   │   ├── mfa.py                # MFA: setup, verify, backup codes
│   │   │   ├── gdpr.py               # GDPR: export, delete, consent
│   │   │   ├── permissions.py        # RBAC role/permission management
│   │   │   ├── settings.py           # User settings: profile, security, notifications
│   │   │   └── ...
│   │   ├── 📂 models/ (27+ files)    # SQLAlchemy ORM models
│   │   ├── 📂 schemas/               # Pydantic request/response schemas
│   │   ├── 📂 services/              # Business logic layer
│   │   │   ├── websocket_manager.py  # WebSocket connection registry
│   │   │   ├── notification_service.py
│   │   │   ├── file_upload.py        # Receipt upload handling
│   │   │   ├── gdpr_service.py       # GDPR workflows
│   │   │   ├── sla_service.py        # SLA monitoring
│   │   │   ├── automation_engine.py  # Rule evaluation engine
│   │   │   ├── report_service.py     # Report generation
│   │   │   └── ...
│   │   └── 📂 utils/
│   │       ├── security.py           # JWT, password hashing
│   │       ├── role_guards.py        # RBAC dependency guards
│   │       ├── encryption.py         # At-rest field encryption (Fernet)
│   │       └── error_handlers.py     # Centralized error responses
│   ├── 📂 tests/
│   │   ├── conftest.py               # Pytest fixtures
│   │   └── test_auth.py              # Auth test suite
│   ├── requirements.txt
│   └── .env
│
├── 📂 frontend/
│   ├── 📂 app/
│   │   ├── 📂 (public)/login/        # Login, register, OAuth callback
│   │   └── 📂 (protected)/           # Auth-guarded pages (24 pages)
│   │       ├── home/                 # Main dashboard
│   │       ├── tasks/                # Task list, kanban, swimlane, calendar
│   │       ├── projects/             # Project list and detail
│   │       ├── teams/                # Team management
│   │       ├── employees/            # Employee directory
│   │       ├── departments/          # Department management
│   │       ├── clients/              # Client management
│   │       ├── timesheets/ (my-time/)# Time tracking
│   │       ├── my-expense/           # Expense management
│   │       ├── dashboards/           # Manager + Executive dashboards
│   │       ├── reports/              # Reports + scheduled reports
│   │       ├── chatbot/              # AI Assistant
│   │       ├── search/               # Global search results
│   │       ├── notifications/        # Notification center + email settings
│   │       ├── support/              # Support ticket portal
│   │       ├── settings/             # Profile, security, notifications, privacy
│   │       ├── integrations/         # Integration management
│   │       ├── automation/           # Automation rules
│   │       ├── workspaces/           # Workspace management
│   │       ├── capacity/             # Capacity planning
│   │       ├── templates/            # Task templates
│   │       ├── ai/                   # AI features
│   │       └── privacy/              # GDPR privacy center
│   ├── 📂 components/                # React components
│   │   ├── 📂 ui/                    # Base UI (Button, Input, Modal, Badge...)
│   │   ├── 📂 shared/                # Shared (Header, Sidebar, Toast...)
│   │   └── 📂 layout/                # Layout wrappers
│   ├── 📂 services/                  # API service layer (TS)
│   ├── 📂 lib/
│   │   ├── auth.ts                   # Auth utilities, token management
│   │   ├── fetcher.ts                # HTTP client with timeout, retry
│   │   └── websocket.ts              # WebSocket client
│   └── 📂 types/                     # TypeScript type definitions
│
├── README.md                         # This file
├── architecture.md                   # Deep-dive architecture documentation
├── AGENTS.md                         # AI agent documentation
└── .gitignore
```

---

## 🔌 API Reference

### Interactive Docs

| Tool | URL |
|------|-----|
| Swagger UI | http://localhost:8000/api/docs |
| ReDoc | http://localhost:8000/api/redoc |
| OpenAPI JSON | http://localhost:8000/api/openapi.json |

### Core Endpoints

#### Authentication
```http
POST   /api/auth/register               # Register (password strength enforced)
POST   /api/auth/login/json             # Login with email/password
POST   /api/auth/login                  # OAuth2 form login
POST   /api/auth/refresh                # Refresh access token
GET    /api/auth/me                     # Get current user
GET    /api/auth/google                 # Start Google OAuth
GET    /api/auth/microsoft              # Start Microsoft OAuth
POST   /api/mfa/setup                   # Setup TOTP MFA
POST   /api/mfa/verify                  # Verify MFA code
POST   /api/mfa/disable                 # Disable MFA
```

#### Users & Teams
```http
GET    /api/users/                      # List all users
POST   /api/users/                      # Create user (admin)
GET    /api/users/me                    # Current user profile
GET    /api/users/{id}                  # User profile
PUT    /api/users/{id}                  # Update user
DELETE /api/users/{id}                  # Delete user (admin, self-delete blocked)
GET    /api/teams/                      # List teams
POST   /api/teams/                      # Create team
```

#### Projects & Tasks
```http
GET    /api/projects                    # List projects
POST   /api/projects                    # Create project
GET    /api/projects/{id}               # Project details
PUT    /api/projects/{id}               # Update project
GET    /api/tasks                       # List tasks (filterable)
POST   /api/tasks                       # Create task
PUT    /api/tasks/{id}                  # Update task
POST   /api/tasks/{id}/dependencies     # Add dependency
POST   /api/tasks/{id}/attachments      # Upload attachment
PUT    /api/tasks/{id}/complete         # Mark complete
```

#### Time Tracking
```http
GET    /api/timesheets                  # List timesheets
POST   /api/timesheets                  # Submit timesheet
PUT    /api/timesheets/{id}/approve     # Approve
GET    /api/timesheets/export           # Export to Excel
POST   /api/time-tracking/start         # Start timer
POST   /api/time-tracking/stop          # Stop timer
GET    /api/my-time                     # Personal time log
GET    /api/workload/capacity           # Team capacity
```

#### Expenses
```http
GET    /api/expenses                    # List expenses
POST   /api/expenses                    # Create expense
PUT    /api/expenses/{id}/submit        # Submit for approval
PUT    /api/expenses/{id}/approve       # Approve (manager)
PUT    /api/expenses/{id}/reject        # Reject (manager)
POST   /api/expenses/{id}/upload-receipt# Upload receipt
GET    /api/expenses/reports/report     # Expense report (filterable)
GET    /api/expenses/reports/export/excel   # Excel export
GET    /api/expenses/reports/export/pdf     # PDF export
GET    /api/expenses/reports/tax-report     # Tax report
```

#### Dashboards & Analytics
```http
GET    /api/dashboard/stats             # Personal stats
GET    /api/dashboard/charts            # Chart datasets
GET    /api/dashboard/manager/team      # Manager team view
GET    /api/dashboard/executive         # Executive KPIs
GET    /api/workload/                   # Workload heatmap
```

#### AI Features
```http
POST   /api/chatbot/chat                # Chat with AI assistant
POST   /api/chatbot/analyze-file        # Upload & analyze file
POST   /api/chatbot/save-activity       # Save AI response as task/note
POST   /api/ai/create-task-nl           # Create task from natural language
POST   /api/ai/predict-deadline         # AI deadline prediction
POST   /api/ai/prioritize-tasks         # AI task prioritization
POST   /api/ai-agent/query              # Agentic AI with function calls
```

#### Notifications
```http
GET    /api/notifications               # List notifications
PUT    /api/notifications/{id}/read     # Mark as read
GET    /api/notifications/preferences   # Preferences
PUT    /api/notifications/preferences   # Update preferences
WS     /ws/notifications?token={jwt}    # WebSocket real-time
POST   /api/notifications/email/send    # Send email
```

#### Other
```http
GET    /api/search?q={query}            # Global search
GET    /api/search/suggestions          # Live suggestions
GET    /api/reports/                    # Reports list
POST   /api/reports/schedule            # Schedule report
GET    /api/gantt/project/{id}          # Gantt data
GET    /api/integrations                # Integrations
POST   /api/integrations                # Add integration
GET    /api/gdpr/export                 # GDPR data export
DELETE /api/gdpr/delete-account         # Right to erasure
GET    /health                          # Health check (with DB ping)
```

---

## 🛡️ Security

LightIDEA implements multiple layers of defence-in-depth security:

### Authentication
| Feature | Implementation |
|---------|---------------|
| Password hashing | bcrypt with 10 rounds |
| Token auth | JWT with configurable expiry |
| Token refresh | `/api/auth/refresh` endpoint |
| MFA | TOTP (RFC 6238) via `pyotp` |
| OAuth security | Token via URL fragment (never query string) — not logged by servers |
| Cookie flags | `SameSite=Strict; Secure; HttpOnly` |

### Authorization
| Feature | Implementation |
|---------|---------------|
| RBAC | Admin, Manager, Lead, Employee roles |
| Role guards | Centralized `is_admin()`, `is_manager()`, `is_lead()` in `role_guards.py` |
| Self-delete protection | Admins cannot delete themselves or the last admin |

### API Security
| Feature | Implementation |
|---------|---------------|
| Rate limiting | `slowapi`: 200 req/min default via IP |
| CORS | Specific methods + headers only (no `*` wildcards) |
| Security headers | X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, Permissions-Policy, XSS-Protection |
| Cache prevention | `Cache-Control: no-store` on all `/api/*` responses |
| Debug endpoint protection | Admin-only authentication required |

### Data Leakage Prevention
| Feature | Implementation |
|---------|---------------|
| Error messages | All `str(e)` replaced with generic messages; details logged server-side |
| API key logging | Only last 4 chars shown: `****XXXX` |
| Sensitive field encryption | Fernet symmetric encryption via `ENCRYPTION_KEY` env var |
| Token exposure | Tokens never appear in server-visible URLs |

### Compliance
| Feature | Implementation |
|---------|---------------|
| GDPR | Data export, deletion, consent management |
| Audit trails | Expense audit log, integration event log |
| MFA | Available for all users |

---

## 🛠️ Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15+ | React framework, App Router, RSC |
| **React** | 19 | UI library |
| **TypeScript** | 5.0 | Type safety |
| **TailwindCSS** | 4.0 | Utility-first CSS |
| **React Hook Form** | 7.71 | Form management |
| **Zod** | 4.3 | Schema validation |
| **Sonner** | 2.0 | Toast notifications |
| **Lucide React** | 0.562 | Icon library |
| **Next Themes** | 0.4 | Dark/light mode |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **FastAPI** | 0.109+ | Python async web framework |
| **Python** | 3.10+ | Core language |
| **SQLAlchemy** | 2.0 | ORM and query builder |
| **Pydantic** | 2.5 | Data validation and settings |
| **Uvicorn** | 0.27+ | ASGI server |
| **python-jose** | 3.3 | JWT encode/decode |
| **passlib[bcrypt]** | 1.7 | Password hashing |
| **slowapi** | 0.1.9 | Rate limiting middleware |
| **google-generativeai** | Latest | Gemini AI integration |
| **pyotp** | 2.9 | TOTP for MFA |
| **cryptography** | Latest | Fernet field encryption |
| **httpx** | Latest | Async HTTP client for OAuth |
| **ReportLab** | 4.0 | PDF generation |
| **OpenPyXL** | 3.1 | Excel file handling |

### Database

| Mode | Engine | Notes |
|------|--------|-------|
| Development | **SQLite** | Zero-config, file-based |
| Production | **PostgreSQL** | Set `DATABASE_URL` in `.env` |

---

## 🧪 Running Tests

```bash
cd backend

# Run all tests
pytest

# With coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/test_auth.py -v
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 Additional Documentation

- [Architecture Deep-Dive](./architecture.md) — System design, data models, service patterns
- [AGENTS.md](./AGENTS.md) — AI agent capabilities and prompting guide
