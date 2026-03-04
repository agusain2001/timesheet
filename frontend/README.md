# Time Sheet — Frontend

A modern, role-based timesheet and project management application built with **Next.js 16** and **React 19**. This repository contains only the frontend module.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | [Next.js](https://nextjs.org/) | 16.1.4 |
| UI Library | [React](https://react.dev/) | 19.2.3 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^4 |
| Icons | Lucide React | ^0.562.0 |
| Forms | React Hook Form + Zod | ^7 / ^4 |
| Theming | next-themes | ^0.4.6 |
| Notifications | Sonner | ^2.0.7 |
| Utility | clsx | ^2.1.1 |

---

## Architecture

```
Browser (Next.js SSR/CSR)
        │
        ▼
 Next.js Rewrites  (/api/* , /ws/*)
        │
        ▼
  Backend API  (FastAPI — separate service)
        │
        ▼
  PostgreSQL Database
```

- **Routing:** Next.js App Router with route groups — `(public)` for auth pages, `(protected)` for authenticated pages.
- **API Proxy:** All `/api/*` and `/ws/*` requests are rewritten to the backend via `next.config.ts`, so no CORS issues in production.
- **Auth:** JWT-based authentication managed via HTTP-only cookies and React context.
- **Theming:** Light/Dark mode via `next-themes` with CSS variables.
- **Build Output:** `standalone` mode for optimised Docker deployment.

---

## File Structure

```
frontend/
├── app/
│   ├── (public)/              # Auth pages (login, register)
│   └── (protected)/           # Authenticated pages
│       ├── home/
│       ├── dashboards/
│       ├── tasks/
│       ├── projects/
│       ├── employees/
│       ├── clients/
│       ├── teams/
│       ├── departments/
│       ├── workspaces/
│       ├── capacity/
│       ├── reports/
│       ├── ai/
│       ├── automation/
│       ├── my-time/
│       ├── my-expense/
│       ├── settings/
│       ├── notifications/
│       └── integrations/
├── components/                # Shared UI components
├── contexts/                  # React context providers (Auth, Theme)
├── features/                  # Feature-specific logic
├── hooks/                     # Custom React hooks
├── services/                  # API service layer (per-module)
├── types/                     # TypeScript type definitions
├── utils/                     # Utility/helper functions
├── public/                    # Static assets
├── next.config.ts             # Next.js configuration & API proxy
├── tailwind.config.ts         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
├── Dockerfile                 # Docker build configuration
└── package.json
```

---

## Prerequisites

### System Requirements

| Requirement | Minimum | Recommended |
|---|---|---|
| OS | Ubuntu 22.04 LTS | Any Linux-based VM |
| RAM | 2 GB | 4 GB |
| Disk | 20 GB SSD | — |
| Node.js | 20 LTS | 20 LTS |

### Required Software

- **Node.js** v20 LTS — [Download](https://nodejs.org/)
- **npm** v10+ (bundled with Node.js)
- **Docker Engine** 24+ *(if running via Docker)*
- **Docker Compose** v2.20+ *(if running via Docker)*

---

## System Configuration

### Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

In production (cloud / Docker), set this at **build time**:

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com npm run build
```

### API Proxy (`next.config.ts`)

All API and WebSocket traffic is proxied automatically — no manual proxy setup needed:

| Route Pattern | Forwarded To |
|---|---|
| `/api/*` | `NEXT_PUBLIC_API_URL/api/*` |
| `/ws/*` | `NEXT_PUBLIC_API_URL/ws/*` |

### Firewall Rules

| Port | Access | Purpose |
|---|---|---|
| 80, 443 | Public | Nginx (HTTP/HTTPS) |
| 3000 | **Internal only** | Next.js (proxied by Nginx) |

---

## Installation & Running

### Local Development

```bash
# Install dependencies
npm ci --frozen-lockfile

# Start the dev server
npm run dev
```

App will be available at `http://localhost:3000`.

### Production Build

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com npm run build
npm run start
```

### Docker

```bash
# From the project root
docker compose up -d
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Pre-Deploy Checklist

- [ ] `NEXT_PUBLIC_API_URL` set to the correct backend URL before build
- [ ] Backend API is running and reachable
- [ ] Port `3000` is **not** exposed publicly (Nginx proxies it)
- [ ] SSL certificates are configured on Nginx
