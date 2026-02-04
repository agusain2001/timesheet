<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.1-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/FastAPI-0.109-green?style=for-the-badge&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/TailwindCSS-4.0-38bdf8?style=for-the-badge&logo=tailwindcss" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Python-3.10+-blue?style=for-the-badge&logo=python" alt="Python" />
  <img src="https://img.shields.io/badge/SQLite-3-003B57?style=for-the-badge&logo=sqlite" alt="SQLite" />
</p>

<h1 align="center">⏱️ LightIDEA Timesheet & Project Management</h1>

<p align="center">
  <strong>A modern, AI-powered enterprise time tracking and project management platform</strong>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-api-documentation">API Docs</a> •
  <a href="#-contributing">Contributing</a>
</p>

---

## 📋 Overview

**LightIDEA** is a comprehensive, full-stack **Time Management & Project Tracking** application designed for modern teams. Built with Next.js 16, FastAPI, and Google Gemini AI, it offers real-time collaboration, smart automation, and beautiful glassmorphism UI.

### 🎯 Key Highlights

- ✨ **Modern Tech Stack:** Next.js 16 (App Router), FastAPI, TypeScript, TailwindCSS 4
- 🤖 **AI-Powered:** Google Gemini integration for intelligent task management
- 🎨 **Beautiful UI:** Glassmorphism design with dark/light themes
- ⚡ **Real-time:** WebSocket notifications and live updates
- 🔒 **Enterprise-Ready:** RBAC, MFA, GDPR compliance, audit trails
- 📊 **Advanced Analytics:** Executive dashboards, comprehensive reporting
- 🔗 **Integrations:** Google Calendar, webhooks, external APIs

---

## ✨ Features

### Core Modules

| Module | Description |
|--------|-------------|
| 🔐 **Authentication & Security** | JWT auth, MFA, RBAC, GDPR compliance |
| 👥 **User & Team Management** | Users, departments, teams, hierarchies |
| 🏢 **Client Management** | Full CRUD for clients and cost centers |
| 📋 **Project Management** | Projects with phases, epics, milestones |
| ✅ **Advanced Task Management** | Tasks with dependencies, priorities, automation |
| ⏰ **Time Tracking** | Timesheets, time tracking, capacity planning |
| 💰 **Expense Management** | Expense tracking, approval workflows, reporting |
| 📊 **Analytics & Dashboards** | Personal, manager, and executive dashboards |
| 🤖 **AI Chatbot** | Google Gemini-powered intelligent assistant |
| 🔔 **Real-time Notifications** | WebSocket + Email notifications |
| 📅 **Calendar Integration** | Google Calendar sync, timeline views |
| 📈 **Reporting** | Gantt charts, custom reports, exports |
| 🔍 **Global Search** | Intelligent search across all entities |
| 🎨 **Custom Views** | Save and share custom filtered views |
| 🎫 **Support System** | Built-in ticket management |
| 🔗 **Integrations** | Webhooks, API integrations, Google services |

### 🤖 AI Features

Powered by **Google Gemini**, LightIDEA offers:

- 💬 **Conversational AI Assistant:** Natural language queries for project data
- 🎯 **Smart Task Prioritization:** AI-driven priority recommendations
- ⏱️ **Deadline Prediction:** ML-based task completion estimates
- 👤 **Intelligent Assignment:** Smart team member suggestions
- 📊 **Automated Reports:** AI-generated insights and summaries
- ⚠️ **Risk Detection:** Proactive identification of project risks

> 📚 For detailed AI documentation, see [AGENTS.md](file:///G:/LightIDEA/AGENTS.md)

---

## 🏗️ Architecture

LightIDEA follows a modern, scalable three-tier architecture:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
│  Browser (React/Next.js) → Mobile (PWA) → Desktop Client → API Consumer     │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js 16 + TypeScript)                  │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ App Router (RSC)  │  Services Layer  │  UI Components  │  State    │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                              Port: 3000                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼ HTTP/REST (JSON + JWT)
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (FastAPI + Python)                        │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ API Gateway → Routers → Services → Business Logic → ORM            │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                              Port: 8000                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼ SQLAlchemy ORM
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE (SQLite/PostgreSQL)                        │
│  Users │ Projects │ Tasks │ Timesheets │ Expenses │ Notifications │ ...     │
└─────────────────────────────────────────────────────────────────────────────┘
```

> 📚 For detailed architecture documentation, see [architecture.md](file:///G:/LightIDEA/architecture.md)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.10+
- **Git**

### 1️⃣ Clone Repository

```bash
git clone https://github.com/agusain2001/timesheet.git
cd timesheet
```

### 2️⃣ Backend Setup

```bash
# Navigate to backend (if separate directory structure)
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set your Gemini API key and other configs

# Start backend server
python -m uvicorn app.main:app --reload --port 8000
```

Backend will be available at **http://localhost:8000**

### 3️⃣ Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local if needed

# Start development server
npm run dev
```

Frontend will be available at **http://localhost:3000**

### 4️⃣ Create Test User

```bash
# Register a new user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!",
    "full_name": "Admin User",
    "role": "admin"
  }'
```

### 5️⃣ Access Application

1. Open **http://localhost:3000**
2. Login with your credentials
3. Explore the dashboard! 🎉

---

## 📁 Project Structure

```
LightIDEA/
├── 📂 backend/                      # FastAPI Backend
│   ├── 📂 app/
│   │   ├── 📂 routers/              # API endpoints (34 routers)
│   │   │   ├── auth.py              # Authentication
│   │   │   ├── tasks.py             # Task management
│   │   │   ├── chatbot.py           # AI chatbot
│   │   │   └── ...
│   │   ├── 📂 models/               # SQLAlchemy models (27 models)
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── task.py
│   │   │   └── ...
│   │   ├── 📂 schemas/              # Pydantic schemas
│   │   ├── 📂 services/             # Business logic layer
│   │   ├── 📂 utils/                # Helper functions
│   │   ├── main.py                  # FastAPI app entry
│   │   ├── config.py                # Configuration
│   │   └── database.py              # Database setup
│   ├── requirements.txt             # Python dependencies
│   ├── .env                         # Environment config
│   └── timesheet.db                 # SQLite database
│
├── 📂 frontend/                     # Next.js Frontend
│   ├── 📂 app/                      # App Router
│   │   ├── 📂 (public)/             # Public routes
│   │   │   └── login/
│   │   ├── 📂 (protected)/          # Protected routes
│   │   │   ├── dashboard/
│   │   │   ├── projects/
│   │   │   ├── tasks/
│   │   │   ├── timesheets/
│   │   │   ├── expenses/
│   │   │   └── ...
│   │   └── layout.tsx               # Root layout
│   ├── 📂 services/                 # API service layer
│   │   ├── api.ts                   # Base API client
│   │   ├── tasks.ts
│   │   ├── chatbot.ts
│   │   └── ...
│   ├── 📂 components/               # React components
│   │   ├── 📂 ui/                   # Base UI components
│   │   ├── 📂 shared/               # Shared components
│   │   └── 📂 layout/               # Layout components
│   ├── 📂 types/                    # TypeScript definitions
│   ├── 📂 lib/                      # Utilities
│   ├── package.json
│   └── .env.local
│
├── 📄 README.md                     # This file
├── 📄 AGENTS.md                     # AI agents documentation
├── 📄 architecture.md               # Architecture details
├── 📄 .gitignore                    # Git ignore rules
└── 📄 project_tracker.csv           # Development tracker (not in git)
```

---

## 🔌 API Documentation

### Interactive API Docs

Once the backend is running, access the interactive API documentation:

- **Swagger UI:** http://localhost:8000/api/docs
- **ReDoc:** http://localhost:8000/api/redoc
- **OpenAPI JSON:** http://localhost:8000/api/openapi.json

### Key Endpoints

| Category | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| **Auth** | `/api/auth/register` | POST | Register new user |
| | `/api/auth/login/json` | POST | Login |
| | `/api/users/me` | GET | Get current user |
| **Projects** | `/api/projects` | GET/POST | List/Create projects |
| | `/api/projects/{id}` | GET/PUT/DELETE | Project CRUD |
| **Tasks** | `/api/tasks` | GET/POST | List/Create tasks |
| | `/api/tasks/{id}/complete` | PUT | Mark complete |
| **Timesheets** | `/api/timesheets` | GET/POST | List/Submit timesheets |
| | `/api/timesheets/export` | GET | Export to Excel |
| **Expenses** | `/api/expenses` | GET/POST | List/Submit expenses |
| | `/api/expenses/{id}/approve` | PUT | Approve expense |
| **Dashboard** | `/api/dashboard/stats` | GET | Dashboard statistics |
| | `/api/dashboard/charts` | GET | Chart data |
| **AI** | `/api/chatbot/chat` | POST | Chat with AI |
| | `/api/ai/predict-deadline` | POST | Predict task deadline |
| **Notifications** | `/api/notifications` | GET | List notifications |
| | `/ws/notifications` | WebSocket | Real-time updates |

---

## 🛠️ Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1 | React framework with App Router |
| **React** | 19.2 | UI library |
| **TypeScript** | 5.0 | Type safety |
| **TailwindCSS** | 4.0 | Utility-first styling |
| **React Hook Form** | 7.71 | Form management |
| **Zod** | 4.3 | Schema validation |
| **Sonner** | 2.0 | Toast notifications |
| **Lucide React** | 0.562 | Icon library |
| **Next Themes** | 0.4 | Theme management |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **FastAPI** | 0.109 | Python web framework |
| **Python** | 3.10+ | Programming language |
| **SQLAlchemy** | 2.0 | ORM and database toolkit |
| **Pydantic** | 2.5 | Data validation |
| **Uvicorn** | 0.27 | ASGI server |
| **Python-Jose** | 3.3 | JWT authentication |
| **Passlib** | 1.7 | Password hashing |
| **Google Generative AI** | 0.3.2 | Gemini AI integration |
| **Alembic** | 1.13 | Database migrations |
| **ReportLab** | 4.0 | PDF generation |
| **OpenPyXL** | 3.1 | Excel file handling |

### Database

- **SQLite** (Development)
- **PostgreSQL** (Production-ready)
