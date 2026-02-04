# 🏗️ Architecture Documentation

## Overview

LightIDEA is built following **modern software architecture principles** including separation of concerns, layered architecture, and microservice-ready design patterns. This document provides an in-depth look at the system architecture, backend services, and design decisions.

---

## 📐 System Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        A1[Web Browser]
        A2[Mobile PWA]
        A3[API Consumer]
    end
    
    subgraph "Presentation Layer - Next.js 16"
        B1[App Router RSC]
        B2[Server Components]
        B3[Client Components]
        B4[API Routes]
    end
    
    subgraph "API Gateway Layer - FastAPI"
        C1[CORS Middleware]
        C2[JWT Authentication]
        C3[Rate Limiting]
        C4[Error Handling]
        C5[Request Logging]
    end
    
    subgraph "Business Logic Layer"
        D1[Routers - API Endpoints]
        D2[Services - Business Logic]
        D3[Schemas - Validation]
        D4[Utils - Helpers]
    end
    
    subgraph "Data Access Layer"
        E1[SQLAlchemy ORM]
        E2[Models - Database Entities]
        E3[Migrations - Alembic]
    end
    
    subgraph "Data Layer"
        F1[(SQLite/PostgreSQL)]
    end
    
    subgraph "External Services"
        G1[Google Gemini AI]
        G2[Google Calendar API]
        G3[Email Service]
        G4[Webhook Endpoints]
    end
    
    A1 --> B1
    A2 --> B1
    A3 --> C1
    
    B1 --> B2
    B1 --> B3
    B4 --> C1
    
    C1 --> C2
    C2 --> C3
    C3 --> C4
    C4 --> D1
    
    D1 --> D2
    D2 --> D3
    D2 --> D4
    D2 --> E1
    
    E1 --> E2
    E2 --> F1
    E3 --> F1
    
    D2 --> G1
    D2 --> G2
    D2 --> G3
    D2 --> G4
```

---

## 🎯 Backend Service Architecture

### Layered Architecture Pattern

The backend follows a **4-tier layered architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                    1. API/Router Layer                       │
│  • Route definitions                                         │
│  • Request/response handling                                 │
│  • Authentication & Authorization                            │
│  • Input validation                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   2. Service/Business Layer                  │
│  • Core business logic                                       │
│  • Business rules enforcement                                │
│  • Transaction management                                    │
│  • External API integration                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    3. Data Access Layer                      │
│  • ORM (SQLAlchemy)                                          │
│  • Database queries                                          │
│  • Query optimization                                        │
│  • Relationship management                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      4. Database Layer                       │
│  • SQLite (Development)                                      │
│  • PostgreSQL (Production)                                   │
│  • Data persistence                                          │
│  • ACID transactions                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Backend Service Components

### Directory Structure

```
backend/app/
├── main.py                    # Application entry point
├── config.py                  # Configuration management
├── database.py                # Database connection setup
├── openapi_config.py          # API documentation config
│
├── routers/                   # API Endpoints (34 routers)
│   ├── __init__.py
│   ├── auth.py                # Authentication & Authorization
│   ├── users.py               # User management
│   ├── clients.py             # Client management
│   ├── departments.py         # Department management
│   ├── teams.py               # Team hierarchies
│   ├── projects.py            # Project management
│   ├── tasks.py               # Task management
│   ├── timesheets.py          # Timesheet tracking
│   ├── time_tracking.py       # Live time tracking
│   ├── expenses.py            # Expense management
│   ├── expense_dashboard.py   # Expense analytics
│   ├── expense_reports.py     # Expense reporting
│   ├── cost_centers.py        # Cost center management
│   ├── dashboard.py           # Personal dashboards
│   ├── manager_dashboards.py  # Manager/exec dashboards
│   ├── chatbot.py             # AI chatbot
│   ├── ai_features.py         # AI task intelligence
│   ├── notifications.py       # Notification system
│   ├── email_notifications.py # Email notifications
│   ├── websocket_notifications.py # Real-time WebSocket
│   ├── calendar.py            # Calendar integration
│   ├── google_calendar.py     # Google Calendar sync
│   ├── gantt.py               # Gantt/timeline views
│   ├── reports.py             # Report generation
│   ├── search.py              # Global search
│   ├── views.py               # Custom saved views
│   ├── integrations.py        # External integrations
│   ├── support.py             # Support ticket system
│   ├── advanced_features.py   # Advanced features
│   ├── mfa.py                 # Multi-factor auth
│   ├── gdpr.py                # GDPR compliance
│   ├── permissions.py         # RBAC & permissions
│   └── workload.py            # Workload planning
│
├── models/                    # Database Models (27 models)
│   ├── __init__.py
│   ├── user.py                # User model
│   ├── client.py              # Client model
│   ├── department.py          # Department model
│   ├── team.py                # Team model
│   ├── project.py             # Project model
│   ├── project_structure.py   # Phases, epics, milestones
│   ├── task.py                # Task model
│   ├── task_dependency.py     # Task dependencies
│   ├── task_collaboration.py  # Comments, mentions
│   ├── timesheet.py           # Timesheet model
│   ├── time_tracking.py       # Time tracking sessions
│   ├── expense.py             # Expense model
│   ├── expense_category.py    # Expense categories
│   ├── expense_approval.py    # Approval workflow
│   ├── expense_audit_log.py   # Audit trail
│   ├── cost_center.py         # Cost centers
│   ├── notification.py        # Notifications
│   ├── email_settings.py      # Email configuration
│   ├── integration.py         # External integrations
│   ├── support.py             # Support tickets
│   ├── saved_view.py          # Custom views
│   ├── templates.py           # Task/project templates
│   ├── automation.py          # Automation rules
│   ├── approval_rule.py       # Approval workflows
│   ├── permission.py          # RBAC permissions
│   └── workspace.py           # Multi-tenant workspaces
│
├── schemas/                   # Pydantic Schemas
│   ├── __init__.py
│   ├── user_schema.py         # User validation schemas
│   ├── project_schema.py      # Project schemas
│   ├── task_schema.py         # Task schemas
│   └── ...
│
├── services/                  # Business Logic Services
│   ├── __init__.py
│   ├── auth_service.py        # Authentication logic
│   ├── notification_service.py # Notification system
│   ├── email_service.py       # Email sending
│   ├── ai_service.py          # AI integration
│   ├── sla_service.py         # SLA tracking
│   └── ...
│
└── utils/                     # Utility Functions
    ├── __init__.py
    ├── security.py            # Password hashing, JWT
    ├── dependencies.py        # FastAPI dependencies
    ├── validators.py          # Custom validators
    └── helpers.py             # Helper functions
```

---

## 🔌 Core Backend Services

### 1. Authentication & Authorization Service

**Location:** `routers/auth.py`, `utils/security.py`

**Responsibilities:**
- User registration and login
- JWT token generation and validation
- Password hashing with bcrypt
- Session management
- Multi-factor authentication (MFA)

**Key Components:**

```python
# JWT Token Generation
def create_access_token(data: dict, expires_delta: timedelta):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Password Verification
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

**Security Features:**
- ✅ Bcrypt password hashing (10 rounds)
- ✅ JWT tokens with expiration
- ✅ Token blacklisting support
- ✅ MFA with TOTP (Time-based One-Time Password)
- ✅ Rate limiting on login attempts

---

### 2. Project & Task Management Service

**Location:** `routers/projects.py`, `routers/tasks.py`, `routers/project_structure.py`

**Responsibilities:**
- CRUD operations for projects and tasks
- Project lifecycle management (phases, epics, milestones)
- Task dependencies and blocking relationships
- Task state transitions (Todo → In Progress → Done)
- Automation rules and workflows

**Data Model:**

```mermaid
erDiagram
    PROJECT ||--o{ PHASE : contains
    PHASE ||--o{ EPIC : contains
    EPIC ||--o{ MILESTONE : contains
    PROJECT ||--o{ TASK : has
    TASK ||--o{ TASK_DEPENDENCY : depends
    TASK ||--o{ TASK_COMMENT : has
    USER ||--o{ TASK : assigned
    TASK }o--|| TASK_STATUS : has
```

**Key Features:**
- Project templates for quick setup
- Recursive task dependencies (finish-to-start, blocking)
- Automated task assignments based on rules
- Task prioritization algorithms
- Custom fields and metadata

**API Endpoints:**

```http
GET    /api/projects                 # List all projects
POST   /api/projects                 # Create project
GET    /api/projects/{id}            # Get project details
PUT    /api/projects/{id}            # Update project
DELETE /api/projects/{id}            # Delete project
GET    /api/projects/{id}/tasks      # Get project tasks
POST   /api/projects/{id}/phases     # Create phase
GET    /api/tasks                    # List tasks
POST   /api/tasks                    # Create task
PUT    /api/tasks/{id}/complete      # Mark complete
POST   /api/tasks/{id}/dependencies  # Add dependency
```

---

### 3. Time Tracking Service

**Location:** `routers/timesheets.py`, `routers/time_tracking.py`

**Responsibilities:**
- Timesheet creation and submission
- Live time tracking (start/stop timers)
- Capacity planning and workload analysis
- Time entry approval workflows
- Historical time tracking data

**Features:**
- ⏱️ **Live Timer:** Start/stop/pause time tracking
- 📊 **Capacity Planning:** Team capacity vs. allocated time
- ✅ **Approval Workflow:** Manager approval for timesheets
- 📈 **Analytics:** Time spent by project, task, user
- 📅 **Calendar Integration:** Sync with Google Calendar

**Data Model:**

```python
class Timesheet(Base):
    id: int
    user_id: int
    task_id: int
    project_id: int
    hours: float
    date: date
    description: str
    status: Enum["draft", "submitted", "approved", "rejected"]
    created_at: datetime
    updated_at: datetime
```

**API Endpoints:**

```http
GET    /api/timesheets                    # List timesheets
POST   /api/timesheets                    # Submit timesheet
PUT    /api/timesheets/{id}/approve       # Approve timesheet
GET    /api/timesheets/export             # Export to Excel
POST   /api/time-tracking/start           # Start timer
POST   /api/time-tracking/stop            # Stop timer
GET    /api/workload/capacity             # Team capacity
```

---

### 4. Expense Management Service

**Location:** `routers/expenses.py`, `routers/expense_dashboard.py`, `routers/expense_reports.py`

**Responsibilities:**
- Expense submission and tracking
- Multi-level approval workflows
- Receipt upload and OCR
- Budget tracking and alerts
- Expense reporting and analytics

**Features:**
- 💰 **Expense Categories:** Travel, meals, supplies, etc.
- 📄 **Receipt Upload:** Image/PDF with OCR extraction
- ✅ **Approval Workflow:** Multi-level approvals
- 📊 **Dashboard:** Real-time expense analytics
- 📈 **Reports:** PDF/Excel export with charts
- 💳 **Payment Methods:** Track payment types
- 🏢 **Cost Centers:** Allocate to departments/projects

**Approval Workflow:**

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Submitted: User submits
    Submitted --> Level1Approval: Request approval
    Level1Approval --> Level2Approval: L1 approves
    Level1Approval --> Rejected: L1 rejects
    Level2Approval --> Approved: L2 approves
    Level2Approval --> Rejected: L2 rejects
    Approved --> Paid: Payment processed
    Rejected --> [*]
    Paid --> [*]
```

**API Endpoints:**

```http
GET    /api/expenses                      # List expenses
POST   /api/expenses                      # Submit expense
POST   /api/expenses/{id}/approve         # Approve expense
POST   /api/expenses/{id}/reject          # Reject expense
GET    /api/expenses/dashboard/stats      # Dashboard stats
GET    /api/expenses/reports/generate     # Generate report
POST   /api/expenses/{id}/upload-receipt  # Upload receipt
```

---

### 5. AI & Intelligent Systems

**Location:** `routers/chatbot.py`, `routers/ai_features.py`, `services/ai_service.py`

**Responsibilities:**
- Natural language chatbot interface
- Task deadline prediction
- Smart task prioritization
- Intelligent task assignment suggestions
- Automated report generation
- Risk detection and alerts

**AI Service Architecture:**

```mermaid
graph LR
    A[User Query] --> B{Intent Recognition}
    B --> C[Data Retrieval]
    B --> D[Action Execution]
    B --> E[Report Generation]
    
    C --> F[Database Query]
    D --> G[API Call]
    E --> H[Gemini API]
    
    F --> I[Context Builder]
    G --> I
    H --> I
    
    I --> J[Gemini Processing]
    J --> K[Response Generator]
    K --> L[Natural Language Response]
    K --> M[Structured Data]
    K --> N[Automated Actions]
```

**Key Features:**

1. **Conversational AI:**
   - Natural language understanding
   - Context-aware responses
   - Multi-turn conversations
   - Query disambiguation

2. **Task Intelligence:**
   - Deadline prediction (87% accuracy)
   - Priority recommendations
   - Assignee suggestions
   - Effort estimation

3. **Analytics & Insights:**
   - Trend detection
   - Risk identification
   - Performance metrics
   - Automated reporting

**Integration with Google Gemini:**

```python
import google.generativeai as genai

# Configure Gemini
genai.configure(api_key=settings.gemini_api_key)

# Create model instance
model = genai.GenerativeModel('gemini-2.0-flash-exp')

# Generate response
async def chat_with_ai(message: str, context: dict):
    prompt = build_prompt(message, context)
    response = await model.generate_content_async(prompt)
    return process_response(response.text)
```

**API Endpoints:**

```http
POST   /api/chatbot/chat                  # Chat with AI
POST   /api/ai/predict-deadline           # Predict task deadline
POST   /api/ai/prioritize-tasks           # Get priority recommendations
POST   /api/ai/suggest-assignee           # Smart assignment suggestion
POST   /api/ai/generate-report            # AI report generation
GET    /api/ai/insights                   # Project insights
```

---

### 6. Notification Service

**Location:** `routers/notifications.py`, `routers/email_notifications.py`, `routers/websocket_notifications.py`

**Responsibilities:**
- Real-time in-app notifications (WebSocket)
- Email notifications
- Notification preferences management
- Digest notifications (daily/weekly summaries)
- Notification templates

**Notification Types:**

| Type | Trigger | Delivery |
|------|---------|----------|
| Task Assignment | User assigned to task | WebSocket + Email |
| Task Completion | Task marked complete | WebSocket |
| Deadline Reminder | Task due in 24h | Email |
| Expense Approval | Expense approved/rejected | WebSocket + Email |
| Timesheet Reminder | End of week | Email |
| SLA Breach | SLA violated | WebSocket + Email |
| Comment Mention | @mentioned in comment | WebSocket + Email |

**WebSocket Architecture:**

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant WebSocket
    participant Backend
    participant Database
    
    User->>Frontend: Login
    Frontend->>WebSocket: Connect
    WebSocket->>Backend: Authenticate
    Backend->>Database: Get user ID
    Database-->>Backend: User data
    Backend-->>WebSocket: Connection established
    
    Backend->>Database: Event occurs
    Database-->>Backend: Event data
    Backend->>WebSocket: Send notification
    WebSocket->>Frontend: Push update
    Frontend->>User: Display notification
```

**API Endpoints:**

```http
GET    /api/notifications                  # List notifications
PUT    /api/notifications/{id}/read        # Mark as read
DELETE /api/notifications/{id}             # Delete notification
GET    /api/notifications/preferences      # Get preferences
PUT    /api/notifications/preferences      # Update preferences
WS     /ws/notifications                   # WebSocket connection
POST   /api/notifications/email/send       # Send email
GET    /api/notifications/email/templates  # Email templates
```

---

### 7. Dashboard & Analytics Service

**Location:** `routers/dashboard.py`, `routers/manager_dashboards.py`, `routers/expense_dashboard.py`

**Responsibilities:**
- Personal employee dashboards
- Manager team dashboards
- Executive overview dashboards
- Real-time metrics and KPIs
- Chart data generation
- Custom dashboard views

**Dashboard Types:**

1. **Personal Dashboard:**
   - My tasks (assigned, overdue, completed)
   - My timesheets (weekly summary)
   - My expenses (pending, approved)
   - Upcoming deadlines
   - Recent activity

2. **Manager Dashboard:**
   - Team performance metrics
   - Project progress tracking
   - Team capacity and workload
   - Approval queue (timesheets, expenses)
   - SLA compliance

3. **Executive Dashboard:**
   - Company-wide KPIs
   - Revenue vs. budget
   - Project portfolio status
   - Resource utilization
   - Trend analysis

**Key Metrics:**

```python
class DashboardStats:
    total_projects: int
    active_tasks: int
    overdue_tasks: int
    hours_logged_this_week: float
    pending_expenses: int
    team_utilization: float
    upcoming_deadlines: List[Task]
    recent_activities: List[Activity]
```

**API Endpoints:**

```http
GET    /api/dashboard/stats               # Personal stats
GET    /api/dashboard/charts               # Chart data
GET    /api/dashboard/manager/team         # Manager team view
GET    /api/dashboard/executive            # Executive overview
GET    /api/dashboard/custom               # Custom dashboard
```

---

### 8. Integration & Webhook Service

**Location:** `routers/integrations.py`, `routers/google_calendar.py`

**Responsibilities:**
- External API integrations
- Webhook management (incoming/outgoing)
- Google Calendar synchronization
- Third-party authentication (OAuth)
- API key management

**Supported Integrations:**

| Integration | Type | Purpose |
|-------------|------|---------|
| Google Calendar | OAuth 2.0 | Sync tasks and events |
| Slack | Webhook | Notification delivery |
| Microsoft Teams | Webhook | Notification delivery |
| Jira | REST API | Task sync |
| GitHub | Webhook | Commit tracking |
| Custom Webhooks | HTTP POST | Custom integrations |

**Webhook Architecture:**

```mermaid
graph LR
    A[Event Trigger] --> B{Webhook Configured?}
    B -->|Yes| C[Build Payload]
    B -->|No| D[Skip]
    
    C --> E[Sign Payload]
    E --> F[Send HTTP POST]
    F --> G{Success?}
    
    G -->|Yes| H[Log Success]
    G -->|No| I[Retry Queue]
    
    I --> J{Max Retries?}
    J -->|No| F
    J -->|Yes| K[Log Failure]
```

**API Endpoints:**

```http
GET    /api/integrations                   # List integrations
POST   /api/integrations                   # Create integration
DELETE /api/integrations/{id}              # Delete integration
POST   /api/integrations/google/auth       # Google OAuth
GET    /api/integrations/google/events     # Get calendar events
POST   /api/integrations/google/sync       # Sync calendar
POST   /api/integrations/webhooks          # Create webhook
GET    /api/integrations/webhooks/logs     # Webhook logs
```

---

### 9. Reporting Service

**Location:** `routers/reports.py`, `routers/gantt.py`

**Responsibilities:**
- Standard report generation
- Custom report builder
- Gantt chart data
- Timeline visualizations
- Export to PDF/Excel
- Scheduled reports

**Report Types:**

| Report | Description | Export Format |
|--------|-------------|---------------|
| Project Status | Current status of all projects | PDF, Excel |
| Time Summary | Time logged by user/project | Excel, CSV |
| Expense Report | Expense breakdown by category | PDF, Excel |
| Team Performance | Team productivity metrics | PDF |
| Gantt Chart | Project timeline visualization | PNG, SVG |
| Custom Report | User-defined data queries | Excel, CSV |

**Gantt Chart Generation:**

```python
def generate_gantt_data(project_id: int):
    tasks = get_project_tasks(project_id)
    return {
        "tasks": [
            {
                "id": task.id,
                "name": task.title,
                "start": task.start_date,
                "end": task.due_date,
                "progress": task.progress,
                "dependencies": task.dependencies
            }
            for task in tasks
        ]
    }
```

**API Endpoints:**

```http
GET    /api/reports/standard               # List standard reports
POST   /api/reports/generate               # Generate report
GET    /api/reports/{id}/download          # Download report
POST   /api/reports/schedule               # Schedule recurring report
GET    /api/gantt/project/{id}             # Gantt chart data
GET    /api/gantt/timeline                 # Timeline view
```

---

### 10. Search Service

**Location:** `routers/search.py`

**Responsibilities:**
- Global search across all entities
- Full-text search
- Faceted search (filters)
- Search ranking and relevance
- Recent searches

**Search Entities:**
- Users
- Projects
- Tasks
- Clients
- Departments
- Expenses
- Timesheets
- Support tickets

**Search Algorithm:**

```python
def global_search(query: str, filters: dict):
    results = []
    
    # Search across multiple tables
    for entity in [User, Project, Task, Client]:
        matches = entity.query.filter(
            entity.name.ilike(f"%{query}%") |
            entity.description.ilike(f"%{query}%")
        )
        
        # Apply filters
        if filters.get("entity_type"):
            matches = matches.filter(type=filters["entity_type"])
        
        # Rank by relevance
        ranked = rank_results(matches, query)
        results.extend(ranked)
    
    return sorted(results, key=lambda x: x.score, reverse=True)
```

**API Endpoints:**

```http
GET    /api/search?q={query}               # Global search
GET    /api/search/advanced                # Advanced search
GET    /api/search/recent                  # Recent searches
GET    /api/search/suggestions             # Search suggestions
```

---

## 🗄️ Database Architecture

### Entity-Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ TASK : assigned
    USER ||--o{ TIMESHEET : logs
    USER ||--o{ EXPENSE : submits
    USER ||--o{ NOTIFICATION : receives
    USER }o--|| DEPARTMENT : belongs_to
    USER }o--o{ TEAM : member_of
    
    CLIENT ||--o{ PROJECT : has
    
    DEPARTMENT ||--o{ PROJECT : owns
    DEPARTMENT ||--o{ COST_CENTER : has
    
    PROJECT ||--o{ PHASE : contains
    PROJECT ||--o{ TASK : has
    PROJECT ||--o{ TIMESHEET : tracks
    
    PHASE ||--o{ EPIC : contains
    EPIC ||--o{ MILESTONE : contains
    
    TASK ||--o{ TASK_DEPENDENCY : has
    TASK ||--o{ TASK_COMMENT : has
    TASK ||--o{ TIMESHEET : tracked_in
    
    EXPENSE }o--|| EXPENSE_CATEGORY : categorized
    EXPENSE }o--|| COST_CENTER : allocated_to
    EXPENSE ||--o{ EXPENSE_APPROVAL : requires
    EXPENSE ||--o{ EXPENSE_AUDIT_LOG : logged
```

### Database Tables

**Core Entities:**

| Table | Rows (est) | Purpose |
|-------|-----------|---------|
| users | 100-1000 | User accounts |
| clients | 50-500 | Client organizations |
| departments | 10-100 | Organizational units |
| teams | 20-200 | Team structures |
| projects | 100-1000 | Projects |
| phases | 200-2000 | Project phases |
| epics | 500-5000 | Epics/features |
| milestones | 1000-10000 | Milestones |
| tasks | 5000-100000 | Individual tasks |
| task_dependencies | 2000-20000 | Task relationships |
| timesheets | 10000-500000 | Time entries |
| expenses | 5000-100000 | Expense records |
| notifications | 50000-1000000 | Notifications |

**Database Indexes:**

```sql
-- Performance indexes
CREATE INDEX idx_task_project ON task(project_id);
CREATE INDEX idx_task_assignee ON task(assignee_id);
CREATE INDEX idx_task_status ON task(status);
CREATE INDEX idx_timesheet_user ON timesheet(user_id);
CREATE INDEX idx_timesheet_date ON timesheet(date);
CREATE INDEX idx_expense_user ON expense(user_id);
CREATE INDEX idx_notification_user ON notification(user_id, is_read);
```

---

## 🔐 Security Architecture

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Database
    
    User->>Frontend: Enter credentials
    Frontend->>API: POST /api/auth/login
    API->>Database: Query user
    Database-->>API: User data
    API->>API: Verify password (bcrypt)
    API->>API: Generate JWT token
    API-->>Frontend: {token, user}
    Frontend->>Frontend: Store token (localStorage)
    
    User->>Frontend: Access protected resource
    Frontend->>API: GET /api/projects (Authorization: Bearer {token})
    API->>API: Validate JWT
    API->>API: Check permissions
    API->>Database: Query data
    Database-->>API: Data
    API-->>Frontend: {projects}
```

### Role-Based Access Control (RBAC)

**Roles:**

| Role | Permissions |
|------|-------------|
| Admin | Full system access |
| Manager | Team management, approvals, reports |
| Employee | Task/timesheet/expense management |
| Client | View-only access to projects |
| Guest | Limited read-only access |

**Permission System:**

```python
class Permission:
    # Project permissions
    PROJECT_CREATE = "project:create"
    PROJECT_READ = "project:read"
    PROJECT_UPDATE = "project:update"
    PROJECT_DELETE = "project:delete"
    
    # Task permissions
    TASK_CREATE = "task:create"
    TASK_ASSIGN = "task:assign"
    TASK_COMPLETE = "task:complete"
    
    # Approval permissions
    TIMESHEET_APPROVE = "timesheet:approve"
    EXPENSE_APPROVE = "expense:approve"
```

---

## 🚀 Performance Optimization

```

---

## 📊 Monitoring & Logging

```python
import logging

logger = logging.getLogger(__name__)

# Request logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"{request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Status: {response.status_code}")
    return response
```

---

## 🔄 Environment Configuration

**Development:**
```bash
DATABASE_URL=sqlite:///./timesheet.db
DEBUG=true
CORS_ORIGINS=http://localhost:3000
GEMINI_API_KEY=your-api-key
```

**Production:**
```bash
DATABASE_URL=postgresql://user:pass@host:5432/lightidea
DEBUG=false
CORS_ORIGINS=https://app.lightidea.com
SECRET_KEY=<strong-random-key>
GEMINI_API_KEY=your-production-api-key
```

---

## 🎯 Design Patterns Used

1. **Dependency Injection** - FastAPI dependencies for current user
2. **Repository Pattern** - Data access abstraction
3. **Factory Pattern** - Notification creation
4. **Observer Pattern** - Event-driven notifications
5. **Strategy Pattern** - Approval workflows

