# LightIDEA — Prerequisites

## System
- **OS:** Ubuntu 22.04 LTS (or any Linux-based cloud VM)
- **RAM:** 2 GB min / 4 GB recommended
- **Disk:** 20 GB SSD min

---

## Backend (FastAPI / Python)

- **Python:** 3.11
- **Install dependencies:**
  ```bash
  pip install -r backend/requirements.txt
  ```
- **Run migrations (first deploy only):**
  ```bash
  cd backend && alembic upgrade head
  ```
- **Key packages:** FastAPI, Uvicorn, SQLAlchemy, Alembic, psycopg2, python-jose, passlib, google-generativeai, LangChain, ReportLab, PyMuPDF

---

## Frontend (Next.js)

- **Node.js:** 20 LTS
- **Install & build:**
  ```bash
  cd frontend
  npm ci --frozen-lockfile
  NEXT_PUBLIC_API_URL=https://api.yourdomain.com npm run build
  ```

---

## Database

- **PostgreSQL 16** (managed: AWS RDS, GCP Cloud SQL, or Azure PostgreSQL)
- Set `DATABASE_URL` in `backend/.env`:
  ```
  DATABASE_URL=postgresql://<user>:<password>@<host>:5432/lightidea
  ```

---

## Docker (if using docker-compose)

- **Docker Engine:** 24+
- **Docker Compose:** v2.20+
- ```bash
  docker compose up -d
  docker compose exec backend alembic upgrade head
  ```
- Place SSL certs in `nginx/certs/` (or use managed TLS from your cloud provider)

---

## Required Environment Variables

Copy `backend/.env.example` → `backend/.env` and fill in:

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SECRET_KEY` | ✅ | Run: `python -c "import secrets; print(secrets.token_hex(64))"` |
| `ALGORITHM` | ✅ | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | ✅ | e.g. `30` |
| `GEMINI_API_KEY` | ✅ | From [aistudio.google.com](https://aistudio.google.com) |
| `ENCRYPTION_KEY` | ✅ | Run: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `CORS_ORIGINS` | ✅ | e.g. `https://app.yourdomain.com` |
| `NEXT_PUBLIC_API_URL` | ✅ | Set at frontend **build time** |
| `GOOGLE_CLIENT_ID/SECRET` | Optional | Google OAuth |
| `MICROSOFT_CLIENT_ID/SECRET` | Optional | Microsoft OAuth |
| `SMTP_*` | Optional | Email notifications |

---

## Firewall Rules

| Port | Open To | Purpose |
|------|---------|---------|
| 80, 443 | Public | Nginx (HTTP/HTTPS) |
| 22 | Your IP | SSH |
| 8000, 3000 | **Block** | Internal only (Nginx proxies) |
| 5432 | **Block** | Internal VPC only |

---

## Pre-deploy Checklist

- [ ] `backend/.env` filled with all required values
- [ ] `NEXT_PUBLIC_API_URL` set before frontend build
- [ ] PostgreSQL 16 running & reachable
- [ ] `alembic upgrade head` executed
- [ ] `uploads/` directory on a persistent volume
- [ ] SSL certificates configured
- [ ] Ports 8000, 3000, 5432 closed to public
