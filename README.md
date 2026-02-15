# ChatBot Application Starter

Full-stack starter for building AI-powered ChatBot applications with Next.js and FastAPI.

## Overview

Build production-ready ChatBot applications with this modern full-stack template. Combines FastAPI's async capabilities with Next.js for a responsive, type-safe development experience. Perfect for AI agents, conversational interfaces, and interactive applications.

### Features

- **End-to-end type safety** with automatically generated OpenAPI clients
- **Hot-reload development** with real-time frontend/backend synchronization
- **User authentication** via fastapi-users with JWT and password recovery
- **PostgreSQL database** with async SQLAlchemy and Alembic migrations
- **Modern UI** built with shadcn/ui and Tailwind CSS
- **Docker support** for consistent development and deployment
- **Test suite** with pytest and React Testing Library

## Technology Stack

- **Zod + TypeScript** – Type safety and schema validation across the stack
- **fastapi-users** – Complete authentication system with secure password hashing, JWT authentication, and email-based password recovery
- **shadcn/ui** – Prebuilt React components with Tailwind CSS
- **OpenAPI-fetch** – Fully typed client generation from the OpenAPI schema
- **UV** – Python dependency management and packaging
- **Docker Compose** – Consistent environments for development and production
- **Pre-commit hooks** – Automated code linting, formatting, and validation before commits

## Prerequisites

- Python 3.12
- Node.js and npm
- pnpm (`npm install -g pnpm`)
- uv (Python dependency manager)
- Docker and Docker Compose

## Getting Started

### 1. Environment Setup

```bash
# Backend environment
cd backend
cp .env.example .env

# Generate secret keys (run three times, one for each key in .env)
python3 -c "import secrets; print(secrets.token_hex(32))"

# Frontend environment
cd frontend
cp .env.example .env.local
```

Edit `backend/.env` and add your generated secret keys for:
- `ACCESS_SECRET_KEY`
- `RESET_PASSWORD_SECRET_KEY`
- `VERIFICATION_SECRET_KEY`

### 2. Database Setup

```bash
# Build and start database container
docker compose build db
docker compose up -d db

# Apply database migrations
make docker-migrate-db
```

### 3. Install Dependencies

**Without Docker:**
```bash
# Backend
cd backend
uv sync

# Frontend
cd frontend
pnpm install
```

**With Docker:**
```bash
make docker-build
```

### 4. Run the Application

**Without Docker:**
```bash
# Start backend (from project root)
make start-backend

# Start frontend (from project root, in another terminal)
make start-frontend
```

**With Docker:**
```bash
# Start backend container
make docker-start-backend

# Start frontend container
make docker-start-frontend
```

### 5. Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs

## GitHub Actions (CI)

The CI workflow runs backend and frontend tests with **sensible defaults**; no repository secrets are required for CI.

- **Backend:** Uses the default test database URL. The workflow starts a Postgres service and sets `TEST_DATABASE_URL` so tests run against it.
- **Frontend:** Uses default build and test settings; no environment variables are set in CI.

If you add workflows that deploy (e.g. to Vercel or a Python host), configure the environment variables described in [Deployment](#deployment) as GitHub Secrets or in your deployment platform.

## Environment variables for deployment

Most options have good defaults for local development. The following matter when you deploy the **Next.js app** (e.g. Vercel) or the **Python API** (e.g. Railway, Render, or any app server).

### Next.js (e.g. Vercel)

Set these in your Next.js project (Vercel: Project → Settings → Environment Variables):

| Variable | Required | Description | Default (local) |
|----------|----------|-------------|-----------------|
| `NEXT_PUBLIC_API_BASE_URL` | Yes (production) | Backend API URL used by the browser (e.g. chat stream). | `http://localhost:8000` |
| `API_BASE_URL` | Yes (production) | Backend API URL used by the Next.js server (API client). | `http://localhost:8000` |

In production, set both to your backend URL (e.g. `https://api.yourdomain.com`). For local dev, the app falls back to `http://localhost:8000` where applicable.

### Python backend (e.g. Railway, Render, Docker)

Set these on the process that runs the FastAPI app (e.g. host env vars or Docker):

| Variable | Required | Description | Default (local) |
|----------|----------|-------------|-----------------|
| `DATABASE_URL` | Yes (production) | PostgreSQL connection string. | `postgresql+asyncpg://postgres:password@localhost:5432/agents_db` |
| `ACCESS_SECRET_KEY` | Yes (production) | JWT access token secret (min 32 chars). | Dev default; **must** override in production. |
| `RESET_PASSWORD_SECRET_KEY` | Yes (production) | Password reset token secret. | Dev default; **must** override in production. |
| `VERIFICATION_SECRET_KEY` | Yes (production) | Email verification token secret. | Dev default; **must** override in production. |
| `CORS_ORIGINS` | Yes (production) | Allowed origins (set format depends on host). | `http://localhost:3000`, `http://localhost:8000` |
| `FRONTEND_URL` | Recommended | Frontend base URL (e.g. for password reset links). | `http://localhost:3000` |

Generate secure secret keys (run three times for the three keys):

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Optional for production: `MAIL_*` (SMTP), `OPENAPI_OUTPUT_FILE`, `OPENAPI_URL`, webhook header names. See `backend/.env.example` and `backend/app/config.py` for all options.

## Development Tips

### Environment Setup

- **Use either Docker or local setup consistently** - don't mix them for the same project session
- The database is configured as `agents_db` for development and runs on port 5432
- Frontend runs on port 3000, backend on port 8000 - these ports are configured in docker-compose.yml

### Keep Your Mac Awake During Development

Prevent your Mac from sleeping during long-running development tasks:

```bash
# Keep display awake for 2 hours (7200 seconds)
caffeinate -d -u -t 7200
```

### Pre-commit Hooks

**First-time setup** (run once per project):

```bash
make install-hooks
```

This installs git hooks that automatically run linting, formatting, and type checking before each commit.

**Before committing**, run the checks manually to catch issues early:

```bash
make precommit
```

This runs all pre-commit checks on your changed files. Fix any issues before committing.

### Clean Development Environment

To ensure a clean development environment:

1. **Stop unnecessary Docker containers**:
   ```bash
   docker ps  # See what's running
   docker stop <container-name>  # Stop unneeded containers
   ```

2. **Use PostgreSQL in Docker** (recommended):
   ```bash
   docker compose up -d db  # Start only the database
   ```

3. **Clear frontend cache** if you encounter build issues:
   ```bash
   cd frontend
   rm -rf .next node_modules/.cache
   pnpm run dev
   ```

4. **Check for port conflicts** - ensure these ports are free:
   - 3000 (Frontend)
   - 8000 (Backend)
   - 5432 (PostgreSQL main)
   - 5433 (PostgreSQL test)

### Type Safety & API Sync

- API documentation is auto-generated at http://localhost:8000/docs
- **OpenAPI schema and TypeScript types sync automatically** when using `make` commands
- Watchers monitor backend routes and auto-regenerate frontend types

**How it works:**
1. Backend watcher detects changes to routes/schemas
2. Auto-generates `local-shared-data/openapi.json`
3. Frontend watcher detects JSON change
4. Auto-regenerates TypeScript types in `app/openapi-client/`

Manual regeneration (if needed): `cd frontend && pnpm run generate-client`

### Testing

Run tests for both backend and frontend:

```bash
# Backend tests
make test-backend

# Frontend tests
make test-frontend

# With Docker
make docker-test-backend
make docker-test-frontend
```

### Database Migrations

Create and apply database schema changes with Alembic:

```bash
# Create a new migration
make docker-db-schema migration_name="add users table"

# Apply migrations
make docker-migrate-db
```

### Email Testing (MailHog)

For local email testing, start the MailHog server:

```bash
make docker-up-mailhog
```

Access the email inbox at http://localhost:8025

## Deployment

- **Frontend (Next.js):** Deploy to Vercel or any Node.js host. Set [Next.js environment variables](#nextjs-eg-vercel) (e.g. `NEXT_PUBLIC_API_BASE_URL` and `API_BASE_URL`) to your backend URL.
- **Backend (FastAPI):** Deploy to Railway, Render, a Docker host, or any Python app server. Set [Python backend environment variables](#python-backend-eg-railway-render-docker) (database URL, secret keys, CORS, frontend URL). Database is hosted separately (e.g. Railway, Supabase).

## Chat Interface

The application includes a modern chat UI with real-time streaming:

- **SSE Streaming**: Token-by-token message display via Server-Sent Events
- **Auto-resize Input**: Modern message input (44px-200px height)
- **Collapsible Sidebar**: Thread management with slide animations
- **Smart Scrolling**: Auto-scroll with manual override button
- **Mobile Responsive**: Overlay sidebar on mobile devices

### Testing the Chat

1. Create an app in the dashboard
2. Click "Chat" to open the chat interface
3. Send a message - it will stream in real-time using the simulator by default

### Subscribers (conversations by customer)

From the apps table or the app page, use **Subscribers** to view conversations grouped by customer. The page uses a 3-panel layout: subscribers list, threads for the selected subscriber, and the conversation. API: `GET /apps/{app_id}/subscribers`, `GET /apps/{app_id}/subscribers/{subscriber_id}/threads` (see OpenAPI at `/docs`).

See `WIP.md` for latest features and changes.

## Next Steps

1. Customize the authentication flow for your use case
2. Configure integration mode (simulator or webhook) in app settings
3. Add your own AI/chatbot backend via webhook integration
4. Customize the chat UI components as needed
5. Configure environment variables for production deployment

---

Built on the [Next.js FastAPI Template](https://github.com/vintasoftware/nextjs-fastapi-template) by Vinta Software
