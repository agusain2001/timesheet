<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.1-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Django-4.2-green?style=for-the-badge&logo=django" alt="Django" />
  <img src="https://img.shields.io/badge/FastAPI-0.109-009688?style=for-the-badge&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/TailwindCSS-4.0-38bdf8?style=for-the-badge&logo=tailwindcss" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Python-3.10+-blue?style=for-the-badge&logo=python" alt="Python" />
</p>

<h1 align="center">⏱️ LightIDEA Timesheet & Project Management</h1>

<p align="center">
  <strong>A modern, AI-powered enterprise time tracking and project management platform</strong>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-api-documentation">API Docs</a>
</p>

---

> **🚧 Work in Progress**
> 
> This project is actively being developed. The backend is being migrated to a **hybrid architecture** using Django REST Framework for core database operations and FastAPI for AI-powered features.

---

## 📋 Overview

**LightIDEA** is a comprehensive, full-stack **Time Management & Project Tracking** application designed for modern teams. Built with Next.js 16, Django REST Framework, FastAPI, and Google Gemini AI.

### 🎯 Key Highlights

- ✨ **Modern Tech Stack:** Next.js 16, Django 4.2, FastAPI, TypeScript
- 🤖 **AI-Powered:** Google Gemini integration for intelligent task management
- 🎨 **Beautiful UI:** Glassmorphism design with dark/light themes
- 🔒 **Enterprise-Ready:** RBAC, approval workflows, audit trails
- 🔗 **Hybrid Backend:** Django for CRUD, FastAPI for AI services

---

## ✨ Features

| Module | Description |
|--------|-------------|
| 👥 **User Management** | Users with roles (Admin, Manager, Employee) |
| 📋 **Project Management** | Projects with budget, status, team members |
| ⏰ **Time Tracking** | Timesheets with approval workflow |
| 🤖 **AI Chatbot** | Google Gemini-powered assistant (coming soon) |
| 📊 **Dashboards** | Personal and manager dashboards (coming soon) |

---

## 🏗️ Architecture

LightIDEA uses a **hybrid backend architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 16)                       │
│                        Port: 3000                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           │                               │
           ▼                               ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│   DJANGO REST FRAMEWORK │   │        FASTAPI          │
│      (Core API)         │   │     (AI Services)       │
│      Port: 8000         │   │      Port: 8001         │
├─────────────────────────┤   ├─────────────────────────┤
│ • User Management       │   │ • Google Gemini AI      │
│ • Project CRUD          │   │ • Chatbot Interface     │
│ • Timesheet Workflow    │   │ • Smart Predictions     │
│ • Approval System       │   │ • Report Generation     │
│ • Admin Interface       │   │ • Risk Detection        │
└─────────────────────────┘   └─────────────────────────┘
           │                               │
           └───────────────┬───────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (SQLite/PostgreSQL)                 │
│           Users │ Projects │ Timesheets │ Approvals             │
└─────────────────────────────────────────────────────────────────┘
```

> 📚 For detailed architecture documentation, see [architecture.md](architecture.md)

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

### 2️⃣ Backend Setup (Django)

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Apply migrations
python manage.py migrate

# Create admin user (optional)
python manage.py createsuperuser

# Start server
python manage.py runserver
```

Backend available at **http://localhost:8000**
Admin panel at **http://localhost:8000/admin/**

### 3️⃣ Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend available at **http://localhost:3000**

---

## 📁 Project Structure

```
LightIDEA/
├── 📂 backend/                      # Django Backend (Core API)
│   ├── manage.py                    # Django CLI
│   ├── requirements.txt             # Python dependencies
│   ├── backend/                     # Django project settings
│   │   ├── settings.py
│   │   └── urls.py
│   └── core/                        # Core application
│       ├── models.py                # User, Project, Timesheet
│       ├── views.py                 # Serializers, ViewSets
│       ├── urls.py                  # API routing
│       └── admin.py                 # Admin configuration
│
├── 📂 frontend/                     # Next.js Frontend
│   ├── 📂 app/                      # App Router
│   ├── 📂 components/               # React components
│   ├── 📂 services/                 # API service layer
│   └── package.json
│
├── 📄 README.md                     # This file
└── 📄 architecture.md               # Architecture details
```

---

## 🔌 API Endpoints

### Django REST API (Port 8000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users/` | GET, POST | List/create users |
| `/api/users/me/` | GET | Current user profile |
| `/api/projects/` | GET, POST | List/create projects |
| `/api/projects/{id}/timesheets/` | GET | Project timesheets |
| `/api/timesheets/` | GET, POST | List/create timesheets |
| `/api/timesheets/{id}/submit/` | POST | Submit for approval |
| `/api/timesheets/{id}/approve/` | POST | Approve timesheet |
| `/api/timesheets/{id}/reject/` | POST | Reject timesheet |
| `/api/timesheets/pending/` | GET | Pending approvals |

### Admin Panel

- **URL:** http://localhost:8000/admin/
- **Login:** Use superuser credentials

---

## 🛠️ Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React framework with App Router |
| **TypeScript** | Type safety |
| **TailwindCSS 4** | Utility-first styling |

### Backend (Hybrid)

| Technology | Purpose |
|------------|---------|
| **Django 4.2** | Core CRUD API, Admin |
| **Django REST Framework** | REST API layer |
| **FastAPI** | AI services (planned) |
| **Google Gemini AI** | Intelligent features (planned) |
| **SQLite/PostgreSQL** | Database |

---

## 📝 Development Status

| Component | Status |
|-----------|--------|
| ✅ Django Models | Complete |
| ✅ REST API (Users, Projects, Timesheets) | Complete |
| ✅ Approval Workflow | Complete |
| ✅ Admin Interface | Complete |
| 🚧 Frontend Integration | In Progress |
| 📋 FastAPI AI Services | Planned |
| 📋 Google Gemini Chatbot | Planned |

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.
