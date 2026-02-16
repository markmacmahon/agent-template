# Backend - AI Agent Guide

Read the root `AGENTS.md` first for project-wide principles (TDD workflow, architecture, non-negotiables).

**IMPORTANT**: Run `make` commands from the **project root**, not from this directory.

## Technology

- Python 3.12, FastAPI (async/await throughout)
- PostgreSQL via asyncpg + SQLAlchemy (async)
- fastapi-users for authentication (JWT + password recovery)
- Alembic for database migrations
- Pydantic for all schemas and validation
- **Package manager: uv** (never pip or poetry)

## Directory Layout

```
backend/
├── app/
│   ├── main.py              # FastAPI app entrypoint
│   ├── config.py            # Settings (via pydantic-settings)
│   ├── database.py          # Async SQLAlchemy engine/session
│   ├── models.py            # SQLAlchemy ORM models
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── users.py             # fastapi-users configuration
│   ├── email.py             # Email sending logic
│   ├── utils.py             # Pure utility functions
│   ├── i18n/                # Internationalisation
│   │   ├── __init__.py      # Exports t()
│   │   └── keys.py          # Backend-internal translated strings
│   ├── routes/              # API route modules
│   │   ├── apps.py          # CRUD for apps
│   │   ├── threads.py       # CRUD for threads
│   │   ├── messages.py      # CRUD for messages
│   │   └── run.py           # POST /run (sync) + GET /run/stream (SSE)
│   └── services/            # Domain logic (no I/O at this layer)
│       ├── orchestrator.py  # ChatOrchestrator -- routes by integration mode
│       ├── simulator.py     # SimulatorHandler -- canned responses
│       └── webhook_client.py # WebhookClient -- HTTP calls + URL validation
├── alembic_migrations/      # Alembic migration versions
├── docs/
│   └── integration-modes.md # Architectural doc for integration modes
├── tests/                   # pytest test suite
│   ├── conftest.py          # Shared fixtures
│   ├── main/
│   ├── routes/
│   ├── services/            # Unit tests for domain services
│   └── utils/
├── pyproject.toml           # Dependencies and tool config
└── start.sh                 # Dev server startup script
```

## Commands

**IMPORTANT**: Run `make` commands from the **project root**, not from this directory.

### Daily Development

```bash
# Start backend (auto-kills port 8000, prevents conflicts)
make start-backend

# Run tests (starts test DB automatically on port 5433)
make test-backend

# Before committing
make precommit
```

### Direct uv Commands (Advanced)

From `backend/` directory only when needed:
```bash
uv sync                     # Install/sync dependencies
uv sync --upgrade           # Update all dependencies
uv run pytest               # Run tests
uv run pytest -x            # Stop on first failure (useful during TDD red-green)
```

### Why Use Make Targets?

The Makefile automatically kills orphan processes:
```bash
make start-backend  # Runs: lsof -ti :8000 | xargs kill before starting
make start-frontend # Runs: lsof -ti :3000 | xargs kill before starting
```

This prevents "port already in use" errors.

## Testing Conventions

- **pytest** with async support (`pytest-asyncio`). Tests live in `tests/`.
- Keep FastAPI routes **thin** -- validation and transport only.
- Prefer **pure domain logic** with unit tests over integration tests.
- Use **Pydantic models + type hints** everywhere.
- Test files mirror the app structure: `app/routes/apps.py` → `tests/routes/test_apps.py`.

## Architecture

- **Routes** (`app/routes/`) -- thin HTTP layer. Validate input, call domain logic, return response.
- **Models** (`app/models.py`) -- SQLAlchemy ORM definitions only.
- **Schemas** (`app/schemas.py`) -- Pydantic models for API contracts. These drive the OpenAPI spec.
- **Utils** (`app/utils.py`) -- Pure functions, no I/O. Easy to test.
- Keep I/O (database, email, external APIs) at the edges. Core logic should be pure and testable.

## Database Workflow

```bash
# Start the database (from project root)
docker compose up -d db

# Run existing migrations (from project root)
make docker-migrate-db

# Create a new migration (from project root)
make docker-db-schema migration_name="add users table"
```

- Development DB: `nexo_db` on port 5432
- Test DB: `nexo_test_db` on port 5433
- Modify models in `app/models.py`, then generate a migration. Never edit migration files by hand unless necessary.

## Internationalisation (i18n) - Error Keys

The backend returns **raw i18n key strings** for all client-facing errors and messages. The frontend owns the English translations.

### HTTP Errors and Success Messages

Return the key directly - do **not** call `t()`:

```python
# Correct: raw key string
raise HTTPException(status_code=404, detail="ERROR_APP_NOT_FOUND")
return {"message": "ACTION_APP_DELETED"}

# Wrong: do not translate for HTTP responses
raise HTTPException(status_code=404, detail=t("ERROR_APP_NOT_FOUND"))
```

After adding a new key, also add it with its English text to `frontend/i18n/keys.ts`.

### Backend-Internal Strings

For text the backend renders itself (not returned to the client as an error code), use `t()` from `app/i18n/keys.py`:

```python
from app.i18n import t

# Simulator responses - rendered as chat message content
reply = t("SIM_GENERIC_ECHO", message=user_text)

# Webhook-client exceptions - logged, not shown to end users
raise WebhookError(t("WEBHOOK_TIMEOUT", detail=exc))

# Email subjects
subject = t("EMAIL_PASSWORD_RESET_SUBJECT")
```

Key naming conventions and the full list of prefixes are documented in the root `AGENTS.md`.

## Adding a Backend Feature

1. **Write a failing test** in `tests/`.
2. Add Pydantic schema in `schemas.py` if new request/response shapes are needed.
3. Implement the route in `routes/` -- keep it thin.
4. Extract domain logic into `utils.py` or a new module if non-trivial.
5. Run `make test-backend` (from project root) to verify.
6. The OpenAPI schema updates automatically -- frontend can regenerate types.
