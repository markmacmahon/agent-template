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

## GitHub Actions Configuration

To run CI/CD pipelines in GitHub Actions, configure these secrets in your repository settings (Settings → Secrets and variables → Actions):

### Required Secrets

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `DATABASE_URL` | PostgreSQL connection string for production | `postgresql+asyncpg://user:pass@host:5432/agents_db` |
| `TEST_DATABASE_URL` | PostgreSQL connection string for tests | `postgresql+asyncpg://postgres:password@localhost:5433/agents_test_db` |
| `ACCESS_SECRET_KEY` | JWT access token secret (generate with command below) | `a1b2c3d4...` (64 chars) |
| `RESET_PASSWORD_SECRET_KEY` | Password reset token secret (generate with command below) | `e5f6g7h8...` (64 chars) |
| `VERIFICATION_SECRET_KEY` | Email verification token secret (generate with command below) | `i9j0k1l2...` (64 chars) |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `https://yourdomain.com,https://app.yourdomain.com` |
| `OPENAPI_OUTPUT_FILE` | Path for OpenAPI schema output (backend: relative to backend/, frontend: relative to frontend/) | Backend: `../local-shared-data/openapi.json`, Frontend: `../local-shared-data/openapi.json` |

### Generating Secret Keys

Use this command to generate secure random keys:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Run this three times to generate the three required secret keys.

### Setting Secrets in GitHub

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with the exact name from the table above

**Note:** The `GITHUB_TOKEN` secret is automatically provided by GitHub Actions and doesn't need to be configured.

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
- Frontend TypeScript types sync automatically when backend routes change
- After backend changes, regenerate types: `cd frontend && pnpm run generate-client`

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

Both frontend and backend can be deployed to Vercel. Configure the environment variables listed in the [GitHub Actions Configuration](#github-actions-configuration) section in your Vercel project settings.

## Next Steps

1. Customize the authentication flow for your use case
2. Add your ChatBot logic to the backend API routes
3. Build your conversation UI in the Next.js frontend
4. Configure environment variables for production deployment

---

Built on the [Next.js FastAPI Template](https://github.com/vintasoftware/nextjs-fastapi-template) by Vinta Software
