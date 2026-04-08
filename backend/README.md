# Time Sheet — Backend

A production-ready REST API for the Timesheet and Project Management platform built with **FastAPI** and **Python 3.11**. This repository contains only the backend module.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | [FastAPI](https://fastapi.tiangolo.com/) | 0.109.0 |
| Server | [Uvicorn](https://www.uvicorn.org/) | 0.27.0 |
| ORM | [SQLAlchemy](https://www.sqlalchemy.org/) | 2.0.25 |
| Migrations | [Alembic](https://alembic.sqlalchemy.org/) | 1.13.1 |
| Validation | [Pydantic v2](https://docs.pydantic.dev/) | 2.5.3 |
| Auth | python-jose + passlib (bcrypt) | 3.3.0 / 1.7.4 |
| AI / LLM | Google Gemini + LangChain + LangGraph | 0.3.2 / ≥2.0 |
| Database | PostgreSQL 16 (prod) / SQLite (dev) | — |
| Security | slowapi (rate limiting), pyotp (2FA), cryptography (Fernet) | — |
| Reports | ReportLab, OpenPyXL, Pillow | — |
| PDF AI | PyMuPDF | ≥1.24.0 |
| HTTP Client | httpx | 0.27.0 |

---

## Architecture

```
Client (Next.js Frontend)
        │
        ▼
   Nginx (Reverse Proxy / TLS termination)
        │
        ▼
  FastAPI (Uvicorn ASGI Server) — port 8000
        │
   ┌────┴────────────────────┐
   │                         │
Routers                  Services
(HTTP endpoints)       (Business logic)
   │                         │
   └────────┬────────────────┘
            │
        SQLAlchemy ORM
            │
        PostgreSQL 16
```

- **Layered structure:** `routers` handle HTTP, `services` contain business logic, `models` define the DB schema.
- **Auth:** JWT access tokens (HS256), optional Google / Microsoft OAuth2, optional TOTP 2FA.
- **AI features:** Google Gemini API with LangChain/LangGraph for PDF extraction and intelligent timesheet assistance.
- **Rate Limiting:** SlowAPI middleware applied globally.
- **Field Encryption:** Sensitive fields encrypted at rest using Fernet symmetric encryption.
- **Migrations:** Alembic handles all schema versioning — never modify the DB manually.

---

## File Structure

```
backend/
├── app/
│   ├── main.py                # FastAPI app entry point, middleware, router registration
│   ├── config.py              # Settings loaded from environment variables
│   ├── database.py            # SQLAlchemy engine & session setup
│   ├── openapi_config.py      # Custom OpenAPI / Swagger config
│   ├── models/                # SQLAlchemy ORM models (one file per domain)
│   ├── routers/               # FastAPI route handlers (one file per domain)
│   ├── services/              # Business logic services
│   ├── schemas/               # Pydantic request/response schemas
│   └── utils/                 # Shared utilities (auth, email, encryption, etc.)
├── tests/                     # Unit and integration tests
├── uploads/                   # User-uploaded files (mount as persistent volume)
├── logs/                      # Application logs
├── requirements.txt           # Python dependencies
├── .env.example               # Environment variable template
├── Dockerfile                 # Docker build configuration
├── seed_data.py               # Initial seed data script
├── seed_permissions.py        # Role & permission seed script
└── alembic/                   # Database migration scripts
```

---

## Prerequisites

### System Requirements

| Requirement | Minimum | Recommended |
|---|---|---|
| OS | Ubuntu 22.04 LTS | Any Linux-based VM |
| RAM | 2 GB | 4 GB |
| Disk | 20 GB SSD | — |
| Python | 3.11 | 3.11 |

### Required Software

- **Python** 3.11 — [Download](https://www.python.org/downloads/)
- **pip** (bundled with Python)
- **PostgreSQL** 16 *(production)* — [Download](https://www.postgresql.org/download/)
- **Docker Engine** 24+ *(if running via Docker)*
- **Docker Compose** v2.20+ *(if running via Docker)*

---

## System Configuration

### Environment Variables

Copy `.env.example` to `.env` and fill in all required values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SECRET_KEY` | ✅ | Random 128-char hex — `python -c "import secrets; print(secrets.token_hex(64))"` |
| `ALGORITHM` | ✅ | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | ✅ | e.g. `30` |
| `GEMINI_API_KEY` | ✅ | From [aistudio.google.com](https://aistudio.google.com) |
| `ENCRYPTION_KEY` | ✅ | Fernet key — `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `CORS_ORIGINS` | ✅ | Comma-separated frontend origins, e.g. `https://app.yourdomain.com` |
| `POSTGRES_DB` | ✅ (Docker) | PostgreSQL database name |
| `POSTGRES_USER` | ✅ (Docker) | PostgreSQL username |
| `POSTGRES_PASSWORD` | ✅ (Docker) | PostgreSQL password |
| `GOOGLE_CLIENT_ID/SECRET` | Optional | Google OAuth2 |
| `MICROSOFT_CLIENT_ID/SECRET` | Optional | Microsoft OAuth2 |
| `OAUTH_REDIRECT_BASE_URL` | Optional | Base URL your frontend is hosted on |
| `SMTP_*` | Optional | Email notification settings |

### Firewall Rules

| Port | Access | Purpose |
|---|---|---|
| 80, 443 | Public | Nginx (HTTP/HTTPS) |
| 22 | Your IP only | SSH |
| 8000 | **Internal only** | FastAPI (proxied by Nginx) |
| 5432 | **Internal VPC only** | PostgreSQL |

---

## Installation & Running

### Local Development

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Linux/macOS
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Copy and fill environment variables
cp .env.example .env

# Run database migrations
alembic upgrade head

# (Optional) Seed initial data
python seed_data.py
python seed_permissions.py

# Start the development server
uvicorn app.main:app --reload --port 8000
```

API will be available at `http://localhost:8000`
Interactive docs at `http://localhost:8000/docs`

### Production (Docker)

```bash
# From the project root
docker compose up -d

# Run migrations after first deploy
docker compose exec backend alembic upgrade head
```

---

## API Documentation

FastAPI auto-generates interactive API documentation:

| Interface | URL |
|---|---|
| Swagger UI | `http://localhost:8000/docs` |
| ReDoc | `http://localhost:8000/redoc` |

---

## Pre-Deploy Checklist

- [ ] `.env` filled with all required values
- [ ] `SECRET_KEY` and `ENCRYPTION_KEY` are strong, unique values
- [ ] `DATABASE_URL` points to PostgreSQL 16 (not SQLite)
- [ ] `alembic upgrade head` has been executed
- [ ] `uploads/` directory mounted as a persistent volume
- [ ] `CORS_ORIGINS` set to the production frontend URL only
- [ ] Ports `8000` and `5432` are **not** exposed publicly
- [ ] SSL certificates configured on Nginx
