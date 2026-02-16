# ChatBot Application Starter - Developer Guide

This document is the **single source of truth** for AI assistants and developers working with this codebase. Tool-specific files (`CLAUDE.md`, `.cursor/rules/`) are thin pointers back to this file.

See also `backend/AGENTS.md` and `frontend/AGENTS.md` for subproject-specific guidance.

## Mission

Evolve this monorepo with **TDD first**, **high craftsmanship**, and **clean modular design**. Every change follows red-green-refactor. No exceptions.

## Non-Negotiables

1. **Tests first** -- always start with a failing test.
2. **Small steps only** -- one behavior at a time.
3. **No speculative abstractions.**
4. **Prefer composition over inheritance.**
5. **No duplication without intent.**
6. **One idiomatic way to do things** -- if multiple approaches exist, choose the simplest consistent one.
7. **Boyscout rule** -- always fix issues when you find them, unless explicitly told otherwise. Leave the codebase cleaner than you found it.

## TDD Workflow (Strict)

Every feature, fix, or refactor follows this cycle:

| Phase | What to do |
|-------|-----------|
| **RED** | Write the smallest failing test describing the desired behavior. |
| **GREEN** | Implement the simplest code that makes it pass. |
| **REFACTOR** | Improve naming, structure, cohesion. Remove duplication. Tests stay green. |

No feature work without this cycle.

**Definition of done:**
- Tests added/updated and all passing
- **For changes that affect user-facing flows** (chat, auth, navigation, critical UI): run `make test-e2e` and fix any failures before considering the work complete.
- Lint + format clean (`make precommit`) - **only run when ready to commit**
- No dead/debug code
- Types correct (Python + TypeScript strict)

## Architecture Principles

- **I/O at the edges** -- API routes, DB, network calls stay in thin boundary layers.
- **Core logic pure and testable** -- no hidden globals, explicit dependencies.
- **Small cohesive modules** -- clear naming over clever abstractions.
- **Minimal cross-boundary coupling** -- backend and frontend share only the OpenAPI contract.

## How AI Agents Should Work Here

When implementing changes:

1. Propose the smallest failing test.
2. Implement minimal passing code.
3. Refactor for clarity and modularity.
4. Run tests frequently during development (`make test-backend` or `make test-frontend`). For changes that touch chat, auth, or other critical user flows, run `make test-e2e` before considering the work complete.
5. **Apply the boyscout rule**: if you discover bugs, test failures, or issues during your work, fix them immediately unless explicitly told to skip them.
6. Run `make precommit` only once when feature is complete and ready to commit.
7. Summarize changes briefly (why + impact).

If unclear, assume the simplest interpretation and proceed test-first.

**Avoid:** large rewrites, over-engineering, adding frameworks without need, running precommit repeatedly during development.

## Writing Conventions

### Typography: No Em Dashes

**Use hyphens (-), not em dashes (—), in all documentation, code comments, and text content.**

Em dashes create inconsistency and can cause encoding issues. Use:
- **Hyphen (-)** for ranges, pauses, and separators
- **Two hyphens (--)** if you need stronger separation

**Wrong:** `User preferences — stored centrally`
**Right:** `User preferences - stored centrally`

**Cleanup tool:** If em dashes slip in, use the `/remove-em-dashes` skill (requires Claude Code restart after skill creation). This skill scans the codebase and replaces all em dashes with hyphens.

## AI Agent Configuration

This project supports multiple AI coding agents via the `AGENTS.md` convention:

| Tool | How it finds instructions |
|------|--------------------------|
| **Codex** | Reads `AGENTS.md` natively |
| **Gemini** | Reads `AGENTS.md` natively |
| **Claude Code** | Reads `CLAUDE.md` → points here |
| **Cursor** | Reads `.cursor/rules/project.mdc` → points here |

**To update AI instructions, edit only this file** (and the subproject `AGENTS.md` files). The pointer files should rarely change.

**Reading order:** This file first. Then **docs/system-overview.md** for architecture, API, and stack. When working in backend or frontend, also read **backend/AGENTS.md** or **frontend/AGENTS.md**.

## Project Structure

```
nexo/
├── AGENTS.md                         # AI instructions - single source of truth
├── CLAUDE.md                         # Pointer → AGENTS.md (for Claude Code)
├── .cursor/rules/project.mdc        # Pointer → AGENTS.md (for Cursor)
├── Makefile                          # Single operational interface (run from root)
├── docs/                             # system-overview.md = architecture, API, stack
├── backend/                          # Python FastAPI backend (see backend/AGENTS.md)
├── frontend/                         # Next.js React frontend (see frontend/AGENTS.md)
├── examples/                         # Webhook example servers (Python, Node); see examples/README.md
└── docker-compose.yml               # Docker services configuration
```

## Makefile -- Single Operational Interface

**IMPORTANT**: Always run `make` commands from the **project root**, never from subdirectories.

The Makefile is the single entrypoint for common tasks. If something is rarely used, it should not become a Make target.

```bash
# Development
make start-backend              # FastAPI on :8000
make start-frontend             # Next.js on :3000

# Testing
make test-backend               # pytest (starts test DB automatically)
make test-frontend              # Jest via pnpm
make test-e2e                  # Playwright E2E (auto-starts backend + frontend; see below)
make test-examples              # Webhook example smoke tests (Python + Node; see examples/README.md)

# Quality
make precommit                  # Lint + format + type check (all files)
make install-hooks              # One-time: install git pre-commit hooks

# Database
docker compose up -d db         # Start PostgreSQL
make docker-migrate-db          # Run Alembic migrations
```

## Type Safety

End-to-end type safety is maintained automatically:
1. Python types defined with Pydantic models (backend)
2. OpenAPI schema auto-generated from FastAPI
3. TypeScript types auto-generated from OpenAPI schema
4. Frontend uses typed API client for all backend calls

Never manually write API types -- they're auto-generated. After backend route changes, regenerate frontend types: `cd frontend && pnpm run generate-client`.

## Internationalisation (i18n)

All user-facing strings are managed through centralised i18n key files. No hardcoded English text in components, routes, or actions.

### Strategy: English only for now, hybrid when we add languages

- **Current:** UI is **English only**. Default is **English** everywhere. No locale in the URL (app runs behind login; SEO is not a concern).
- **Foundation:** Keys live in `frontend/i18n/keys.ts` and `backend/app/i18n/keys.py`; frontend uses `t("KEY")` and `translateError(detail)`. This gives a single source of truth and a clear place to add per-locale content later.
- **Later (when adding languages):** Use the **hybrid** approach: no `[locale]` segment in paths. Resolve language from **cookie** or **user.locale** (from API); load the appropriate bundle in the root layout. No URL changes, minimal routing impact.

### Locale / language (for future use)

We use **two-letter language codes** only (**ISO 639-1**, e.g. `en`, `es`, `pt`). The system has a **locale** property in the API and DB so we can add translations later without schema churn. Default is always **English** (`en`).

| Where        | Property | Default | Notes |
|-------------|----------|---------|--------|
| Database    | `user.locale` | `en` | Stored on the user table; for future language preference. |
| API         | `UserRead.locale`, `UserUpdate.locale` | `en` | Returned in `/users/me`; PATCH to update. |
| Backend     | `SUPPORTED_LOCALES`, `DEFAULT_LOCALE` in `schemas.py` | `en` | Validation; extend when adding languages. |
| Frontend    | `DEFAULT_LOCALE`, `SUPPORTED_LOCALES` in `lib/locale.ts` | `en` | Use `user.locale` from API when present; fallback to default. |

Only **English** is surfaced in the UI today. When we add translations, backend and frontend key files (or per-locale JSON) will be keyed by locale; resolution will be cookie or `user.locale`, not the URL.

### Key Files

| File | Purpose |
|------|---------|
| `frontend/i18n/keys.ts` | **Single source of truth** for all frontend UI text AND the English translations of backend error keys |
| `backend/app/i18n/keys.py` | Backend-internal strings only (simulator replies, webhook-client exceptions, email subjects) |

### The Error-Key Contract

Backend HTTP responses return **raw i18n keys** (not English text) for all errors and action messages:

```python
# Backend route - returns the KEY, not a translated string
raise HTTPException(status_code=404, detail="ERROR_APP_NOT_FOUND")
return {"message": "ACTION_APP_DELETED"}
```

The frontend translates these keys to human-readable text:

```typescript
import { translateError } from "@/i18n/keys";
// "ERROR_APP_NOT_FOUND" → "App not found or not authorized"
const message = translateError(error.detail);
```

This is the same pattern fastapi-users already uses (e.g. `"LOGIN_BAD_CREDENTIALS"`). The `translateError()` function falls back to returning the raw string if the key is unknown.

### Rules for Adding New Strings

1. **Frontend UI text** - add key to `frontend/i18n/keys.ts`, use `t("KEY")` in components/actions.
2. **Backend HTTP errors/messages** - return the raw key string from the route; add the key + English text to `frontend/i18n/keys.ts`.
3. **Backend-internal text** (simulator, webhook-client, email) - add to `backend/app/i18n/keys.py`, use `t("KEY")`.
4. **Validation messages** (Zod schemas) - use `t("FORM_VALIDATION_*")` in `lib/definitions.ts`.

### Naming Conventions

Keys use `SCREAMING_SNAKE_CASE` with a category prefix:

| Prefix | Usage |
|--------|-------|
| `ERROR_*` | Error messages (both frontend-originated and backend-originated) |
| `ACTION_*` | Success/confirmation messages |
| `AUTH_*` | Authentication UI (login, register, password reset) |
| `FORM_*` / `FORM_VALIDATION_*` | Form labels and validation messages |
| `APP_*` | App CRUD UI |
| `CHAT_*` | Chat interface |
| `NAV_*` | Navigation / breadcrumbs |
| `WEBHOOK_*` | Webhook configuration UI and backend webhook-test keys |
| `SIM_*` | Simulator UI labels and backend simulator responses |
| `HOME_*` | Landing page |
| `PAGINATION_*` | Table pagination |
| `EMAIL_*` | Email subjects (backend only) |

## Configuration Reference

### Database
- **Development:** `nexo_db` on port 5432
- **Test:** `nexo_test_db` on port 5433
- All names use the `agents_` prefix

### Environment Files
- Backend: `backend/.env` (requires 3 generated secret keys)
- Frontend: `frontend/.env.local`
- Both have `.env.example` templates

### Package Managers
- **Backend:** `uv` (not pip/poetry)
- **Frontend:** `pnpm` (not npm/yarn)

## Deployment

Both frontend and backend can deploy to Vercel, Docker, or any compatible host. Database hosted separately.

## WIP.md

The `WIP.md` file tracks work-in-progress changes. Keep it focused on current development (last 1-2 weeks), not a complete changelog. Prune completed items regularly.

## Troubleshooting

**TypeScript errors after backend changes:** `cd frontend && rm -rf .next && pnpm run dev`

**Database connection issues:** `docker compose down && docker volume rm nexo_postgres_data && docker compose up -d db && make docker-migrate-db`

**Dependency conflicts:** `cd backend && uv sync` or `cd frontend && pnpm install`

## E2E tests (Playwright)

E2E tests run full user flows in a browser. **You do not need to start the backend or frontend manually.** Playwright starts both servers as part of the test run (see `frontend/playwright.config.ts` → `webServer`). When not in CI, it will reuse already-running servers if they are on the expected ports.

**Prerequisites (from project root):**

1. **Development database** - `docker compose up -d db` (backend started by Playwright uses the dev DB).
2. **Test user** - A user `tester1@example.com` / `Password#99` with at least one app (for chat-flow specs).

**Run E2E:**

```bash
make test-e2e                  # From project root; headless
cd frontend && pnpm test:e2e    # Or from frontend
pnpm test:e2e:headed           # With browser visible
pnpm test:e2e:ui               # Playwright UI (from frontend)
```

For debugging (full backend/frontend logs on failure): `./frontend/run-e2e-debug.sh`. Logs go to `/tmp/*-e2e.log`.

More detail and test conventions: `frontend/AGENTS.md` → E2E Testing.
