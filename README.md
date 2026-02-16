# Nexo Agent Template

**An orchestration layer for modular conversational agents.**

Build AI agents that share state, compose seamlessly, and integrate anywhere - chatbots, workflows, or standalone apps. Agents connect via webhooks and receive shared context (user preferences, conversation memory) at runtime.

## Vision

Most conversational systems tightly couple state with execution. This runtime **decouples** them:

- **Shared state layer** - User preferences, memory, and context managed centrally
- **Agent orchestration** - Route between multiple agents while preserving context
- **Modular composition** - Add agents without changing infrastructure
- **Flexible deployment** - Standalone service or embedded in existing systems

**Today:** Foundation runtime with webhook routing, SSE streaming, and conversation threading.
**Tomorrow:** Stateful orchestration with centralized state store, runtime context injection, and agent-to-agent handoff.

## Overview

The **Dashboard** is where you create, configure, test, and monitor your agents. Each agent connects via webhook, receiving customer messages and returning responses - either simple answers or multi-turn flows. A built-in simulator lets you test integrations without deploying a backend.

### Current Capabilities

- **Dashboard** for creating and managing agents, viewing subscribers, and monitoring conversations
- **Webhook integration** with HMAC-SHA256 signing, SSE streaming, and in-app contract documentation
- **Built-in simulator** for testing conversational flows without an external backend
- **Real-time chat** with SSE token streaming, threaded conversations, and subscriber tracking
- **End-to-end type safety** with auto-generated OpenAPI clients
- **User authentication** via fastapi-users with JWT and password recovery
- **PostgreSQL database** with async SQLAlchemy and Alembic migrations
- **Modern UI** built with shadcn/ui and Tailwind CSS

## Technology Stack

- **Zod + TypeScript** – Type safety and schema validation across the stack
- **fastapi-users** – Complete authentication system with secure password hashing, JWT authentication, and email-based password recovery
- **shadcn/ui** – Prebuilt React components with Tailwind CSS
- **OpenAPI-fetch** – Fully typed client generation from the OpenAPI schema
- **UV** – Python dependency management and packaging
- **Docker Compose** – Consistent environments for development and production
- **Pre-commit hooks** – Automated code linting, formatting, and validation before commits

## Prerequisites

- **Docker Desktop** - [Install for Mac](https://docs.docker.com/desktop/setup/install/mac-install/) or [other platforms](https://docs.docker.com/engine/install/)
- **Python 3.12** - `brew install python@3.12` or [download](https://www.python.org/downloads/)
- **Node.js** - `brew install node` or [download](https://nodejs.org/)
- **pnpm** - `npm install -g pnpm`
- **uv** - `curl -LsSf https://astral.sh/uv/install.sh | sh` or [see docs](https://docs.astral.sh/uv/getting-started/installation/)

## Getting Started

### 1. Clone and Setup Environment

```bash
# Backend
cd backend
cp .env.example .env

# Generate secret keys (run three times, one for each key)
python3 -c "import secrets; print(secrets.token_hex(32))"

# Edit backend/.env and add your generated secret keys

# Frontend
cd frontend
cp .env.example .env.local
```

### 2. Start Database

```bash
make docker-up-db
make docker-migrate-db
```

### 3. Install Dependencies

```bash
cd backend && uv sync
cd frontend && pnpm install
```

### 4. Install Playwright Browsers (for E2E tests)

```bash
cd frontend && pnpm exec playwright install
```

**Note:** Skip this step if you're not running E2E tests. Required before `make test-e2e`.

### 5. Run the Application

```bash
make start-backend    # Terminal 1
make start-frontend   # Terminal 2
```

### 6. Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs

### 7. Seed Test Data (for E2E tests)

```bash
make seed  # Creates test user (tester@nexo.xyz) and test app
```

**Credentials:** All test users use password `NexoPass#99`
**Note:** Skip this step if you're not running E2E tests. Safe to run multiple times (idempotent).

### 8. Run Tests (optional)

```bash
make test-backend   # Backend unit tests
make test-frontend  # Frontend unit tests
make test-e2e       # E2E tests (requires steps 4 and 7)
```

### 9. Webhook examples (optional)

The **[examples/](examples/)** directory contains minimal webhook servers (Python stdlib, Node.js) that implement the partner webhook contract. Use them to test the platform with a real webhook or as a reference for your own integration.

- **Run an example:** See [examples/README.md](examples/README.md) for step-by-step instructions (start one example, set its URL in an App, then chat).
- **Verify they work:** From the project root run `make test-examples`. This starts each example in turn, sends a test request, and checks the response (requires Python 3 and Node.js).

Ports: Python 8080, TypeScript 8081 (overridable with `PORT`). They do not conflict with the main app (3000, 8000).

## GitHub Actions (CI)

The CI workflow runs backend and frontend tests with **sensible defaults**; no repository secrets are required for CI.

- **Backend:** Uses the default test database URL. The workflow starts a Postgres service and sets `TEST_DATABASE_URL` so tests run against it.
- **Frontend:** Uses default build and test settings; no environment variables are set in CI.

If you add workflows that deploy (e.g. to Vercel or a Python host), configure the environment variables described in [Deployment](#deployment) as GitHub Secrets or in your deployment platform.

## Environment variables for deployment

**Most environment variables have sensible defaults and work out of the box for local development.** You only need to configure these when deploying to production.

### Next.js frontend

Set these in your Next.js project (Vercel: Project → Settings → Environment Variables):

| Variable | Required | Description | Default (local) |
|----------|----------|-------------|-----------------|
| `NEXT_PUBLIC_API_BASE_URL` | Yes (production) | Backend API URL used by the browser (e.g. chat stream). | `http://localhost:8000` |
| `API_BASE_URL` | Yes (production) | Backend API URL used by the Next.js server (API client). | `http://localhost:8000` |

In production, set both to your backend URL (e.g. `https://api.yourdomain.com`). For local dev, the app falls back to `http://localhost:8000` where applicable.

### Python backend

Set these on the process that runs the FastAPI app:

| Variable | Required | Description | Default (local) |
|----------|----------|-------------|-----------------|
| `DATABASE_URL` | Yes (production) | PostgreSQL connection string. | `postgresql+asyncpg://postgres:password@localhost:5432/nexo_db` |
| `DATABASE_POOL_CLASS` | No | Connection pooling: `"null"` (serverless) or `"queue"` (traditional servers). | `"null"` |
| `ACCESS_SECRET_KEY` | Yes (production) | JWT access token secret (min 32 chars). | Dev default; **must** override in production. |
| `RESET_PASSWORD_SECRET_KEY` | Yes (production) | Password reset token secret. | Dev default; **must** override in production. |
| `VERIFICATION_SECRET_KEY` | Yes (production) | Email verification token secret. | Dev default; **must** override in production. |
| `CORS_ORIGINS` | Yes (production) | Allowed origins (set format depends on host). | `http://localhost:3000`, `http://localhost:8000` |
| `FRONTEND_URL` | Recommended | Frontend base URL (e.g. for password reset links). | `http://localhost:3000` |

Generate secure secret keys (run three times for the three keys):

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

**Connection Pooling**: Set `DATABASE_POOL_CLASS=queue` for better performance on traditional servers (Docker, VPS). Defaults to `"null"` for serverless compatibility.

Optional for production: `MAIL_*` (SMTP), `OPENAPI_OUTPUT_FILE`, `OPENAPI_URL`, webhook header names, `DATABASE_POOL_SIZE`, `DATABASE_MAX_OVERFLOW`, `DATABASE_POOL_RECYCLE`. See `backend/.env.example` and `backend/app/config.py` for all options.

## Development Tips

- **Ports**: Frontend (3000), Backend (8000), Database (5432), Test DB (5433)
- **Docker Desktop**: Must be running for database (Mac users: check whale icon in menu bar)
- **Port conflicts**: Use `lsof -i :5432` to find conflicts, `brew services stop postgresql` to stop local PostgreSQL
- **Pre-commit**: Run `make precommit` before committing

### Type Safety & API Sync

- API documentation is auto-generated at http://localhost:8000/docs
- **OpenAPI schema and TypeScript types sync automatically** when using `make` commands
- Watchers monitor backend routes and auto-regenerate frontend types

**How it works:**
1. Backend watcher detects changes to routes/schemas
2. Auto-generates `local-shared-data/openapi.json`
3. Frontend watcher detects JSON change
4. Auto-regenerates TypeScript types in `lib/openapi-client/`

Manual regeneration (if needed): `cd frontend && pnpm run generate-client`

### Testing

```bash
make test-backend   # Backend tests (pytest)
make test-frontend  # Frontend tests (Jest)
make test-e2e       # E2E tests (Playwright)
```

### Database Migrations

```bash
make docker-migrate-db  # Apply migrations
cd backend && uv run alembic revision --autogenerate -m "description"  # Create new migration
```

### Email Testing

```bash
make docker-up-mailhog  # Start MailHog
# View emails at http://localhost:8025
```

## Deployment

- **Frontend (Next.js):** Deploy to Vercel or any Node.js host. Set [Next.js environment variables](#nextjs-frontend) (e.g. `NEXT_PUBLIC_API_BASE_URL` and `API_BASE_URL`) to your backend URL.
- **Backend (FastAPI):** Deploy using Docker, Vercel, or any Python app server. Set [Python backend environment variables](#python-backend) (database URL, secret keys, CORS, frontend URL). Database is hosted separately.

## Chat Interface

The dashboard includes a real-time chat UI for testing and monitoring conversations:

- **SSE Streaming**: Token-by-token message display via Server-Sent Events
- **Threaded conversations**: Each customer interaction is a separate thread
- **Auto-resize Input**: Modern message input (44px-200px height)
- **Collapsible Sidebar**: Thread management with slide animations
- **Smart Scrolling**: Auto-scroll with manual override button
- **Mobile Responsive**: Overlay sidebar on mobile devices
- **Scenario demos**: Built-in presets (support triage, match commentary, reservations, surveys) stream canned user + assistant messages so stakeholders can experience long-running tasks without typing.

### Testing Your App

1. Create an App in the dashboard
2. Configure integration mode - use the simulator for testing or set up your webhook
3. Click "Chat" to open the chat interface and test the conversation flow

### Subscribers (conversations by customer)

From the apps table or the app page, use **Subscribers** to view conversations grouped by customer. The page uses a 3-panel layout (subscribers → threads → chat) with cursor-based pagination (`limit` + `cursor` query params, response `{ items, next_cursor }`). API: `GET /apps/{app_id}/subscribers`, `GET /apps/{app_id}/subscribers/{subscriber_id}/threads` (see OpenAPI at `/docs`).

## Documentation

- **[docs/](docs/)** - Project docs. Index: [docs/README.md](docs/README.md). Main reference: [docs/system-overview.md](docs/system-overview.md).
- **[examples/](examples/)** - Webhook examples (Python stdlib, Node http). Run in separate processes; ports 8080 (Python) and 8081 (Node). See [examples/README.md](examples/README.md). Run `make test-examples` to verify they start and respond correctly.
- **AI assistants and contributors:** [AGENTS.md](AGENTS.md) first (workflow, conventions), then docs/system-overview.md (architecture, API).

## Next Steps

1. Create an App and test with the built-in simulator
2. Build your webhook endpoint - see the in-app contract documentation for request/response format
3. Configure webhook URL and optional HMAC signing in your App settings
4. Use the Subscribers view to monitor customer conversations
5. Configure environment variables for production deployment

---

Built on the [Next.js FastAPI Template](https://github.com/vintasoftware/nextjs-fastapi-template) by Vinta Software
