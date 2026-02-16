# Frontend - AI Agent Guide

Read the root `AGENTS.md` first for project-wide principles (TDD workflow, architecture, non-negotiables).

**IMPORTANT**: Run `make` commands from the **project root**, not from this directory.

## Technology

- Next.js 16+ (App Router, not Pages Router)
- React 19+
- TypeScript (strict -- avoid `any`)
- Tailwind CSS v4 (CSS-first config in `globals.css`, no `tailwind.config.js`)
- shadcn/ui components + unified `radix-ui` package (not individual `@radix-ui/react-*`)
- `lucide-react` for icons (not `@radix-ui/react-icons`)
- OpenAPI-generated type-safe API client (`@hey-api/openapi-ts`)
- Zod for runtime validation
- PostCSS via `postcss.config.mjs` (ESM)
- **Package manager: pnpm** (never npm or yarn)

## Directory Layout

```
frontend/
├── app/                     # Next.js App Router pages
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   ├── auth/                # Authentication pages (grouped)
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── dashboard/
│   ├── clientService.ts     # Client-side API service
│   ├── globals.css          # Global styles
│   └── openapi-client/      # Auto-generated API client (do not edit)
├── components/
│   ├── ui/                  # shadcn/ui components (do not edit manually)
│   ├── actions/             # Server actions (login, register, etc.)
│   ├── page-pagination.tsx
│   └── page-size-selector.tsx
├── i18n/
│   └── keys.ts              # All user-facing strings (single source of truth)
├── lib/
│   ├── clientConfig.ts      # API client configuration
│   ├── definitions.ts       # Shared TypeScript types
│   └── utils.ts             # Utility functions
├── __tests__/               # Jest unit tests
├── e2e/                     # Playwright E2E tests
├── package.json
└── start.sh                 # Dev server startup script
```

## Commands

**IMPORTANT**: Run `make` commands from the **project root**, not from this directory.

### Daily Development

```bash
# Start frontend (auto-kills port 3000, prevents conflicts)
make start-frontend

# Run unit tests
make test-frontend

# Run E2E tests (backend + frontend are auto-started by Playwright; see E2E Testing below)
make test-e2e              # From project root
pnpm test:e2e              # Headless (from frontend)
pnpm test:e2e:headed       # See browser
pnpm test:e2e:ui          # Interactive UI

# Before committing
make precommit
```

### E2E Testing

E2E tests use Playwright to test full user flows (including login, chat, SSE streaming). **The frontend and backend servers are started automatically** as part of the test run — you do not need to run `make start-backend` or `make start-frontend` first. Playwright’s `webServer` config in `playwright.config.ts` starts both; when not in CI, it will reuse already-running servers on ports 8000 and 3000 if present.

**Prerequisites:**

- **Development database:** From project root, `docker compose up -d db`. The backend started by Playwright connects to this DB.
- **Test user:** `tester1@example.com` / `Password#99` with at least one app (required by chat-flow specs).

**Run from project root:** `make test-e2e`  
**Run from frontend:** `pnpm test:e2e` (headless), `pnpm test:e2e:headed`, `pnpm test:e2e:ui`

**E2E with full server logs (debugging):** To capture backend and frontend output to files and see them on failure, use the debug script. It starts backend and frontend with logging, then runs the same Playwright command (Playwright reuses the running servers). From project root: `./frontend/run-e2e-debug.sh`. Logs: `/tmp/backend-e2e.log`, `/tmp/frontend-e2e.log`, `/tmp/test-e2e.log`.

Always fix bugs discovered in E2E tests immediately.

### OpenAPI Client Auto-Regeneration

**This happens automatically** when using `make start-frontend`:

1. Backend watcher detects changes to `main.py`, `schemas.py`, or `routes/*.py`
2. Auto-generates `local-shared-data/openapi.json`
3. Frontend watcher detects `openapi.json` change
4. Auto-runs `pnpm run generate-client`
5. TypeScript types in `lib/openapi-client/` update automatically

**Manual regeneration** (if watchers aren't running):
```bash
cd frontend
pnpm run generate-client
cd ..
make start-frontend
```

**Symptoms that indicate you need to regenerate:**
- TypeScript errors: "Module '@/lib/openapi-client' has no exported member"
- TypeScript errors: "Cannot find module '@/app/clientService'"
- After pulling backend changes (if you're not running `make start-frontend`)
- After backend migrations

### Direct pnpm Commands (Advanced)

From `frontend/` directory only when needed:
```bash
pnpm install                # Install dependencies
pnpm run dev                # Start dev server (prefer `make start-frontend`)
pnpm test                   # Run tests
pnpm run lint               # ESLint
pnpm run lint:fix           # ESLint with auto-fix
pnpm run prettier           # Format all files
pnpm run tsc                # Type check
pnpm run generate-client    # Regenerate API client from OpenAPI schema
```

## Testing Conventions

- **Jest + React Testing Library**. Tests live in `__tests__/`.
- Test **behavior**, not implementation details.
- Keep UI components thin -- move logic into testable hooks or pure functions.
- Import `render` from `@testing-library/react`.
- Import `screen`, `fireEvent`, `waitFor` from `@testing-library/dom`.

### Test file structure

Tests mirror the source layout, grouped by type:

```
__tests__/
├── actions/           # Server action tests (.ts, no JSX)
│   ├── login-action.test.ts
│   ├── register-action.test.ts
│   ├── apps-action.test.ts
│   └── logout-action.test.ts
├── pages/             # Page component tests (.tsx)
│   ├── home.test.tsx
│   ├── login.test.tsx
│   └── create-app.test.tsx
├── components/        # Reusable component tests (.tsx)
│   ├── page-pagination.test.tsx
│   └── delete-button.test.tsx
└── lib/               # Utility / pure function tests (.ts)
    ├── utils.test.ts
    └── definitions.test.ts
```

Naming rules:
- **Folder** tells you what type of thing is tested (action / page / component / lib)
- **File name** matches the source file name (kebab-case)
- **Extension** is `.ts` for non-JSX, `.tsx` for JSX
- Drop redundant suffixes (no `Page`, `Action`) -- the folder already communicates that

## Architecture

- **Pages** (`app/**/page.tsx`) -- thin UI shells. Compose components, handle routing. Auth pages live under `app/auth/`.
- **Components** (`components/`) -- reusable UI. Keep business logic out.
- **Actions** (`components/actions/`) -- server actions for form submissions and mutations.
- **lib/** -- pure utility functions and configuration. Easy to test.
- **openapi-client/** -- auto-generated from backend OpenAPI schema. **Never edit by hand.**
- **ui/** -- shadcn/ui components. Add new ones via `pnpm dlx shadcn@latest add <component>`, don't write from scratch. These use the unified `radix-ui` package and `lucide-react` icons.

## Type Safety

The API client is auto-generated from the backend's OpenAPI schema:

```bash
cd frontend && pnpm run generate-client
```

Run this after any backend route changes. Never manually write API types -- they come from the generated client in `lib/openapi-client/`.

## Internationalisation (i18n)

All user-facing strings live in `i18n/keys.ts`. Never hardcode English text in components, pages, actions, or hooks.

### Using `t()` for UI Text

```typescript
import { t } from "@/i18n/keys";

// In JSX
<h1>{t("AUTH_LOGIN_TITLE")}</h1>
<Button>{t("APP_CREATE_SUBMIT")}</Button>

// In props / defaults
placeholder={t("CHAT_PLACEHOLDER")}
```

### Translating Backend Error Keys

The backend returns raw i18n keys (e.g. `"ERROR_APP_NOT_FOUND"`) in `error.detail`. Use `translateError()` to convert them to human-readable text:

```typescript
import { translateError } from "@/i18n/keys";

// In server actions — when extracting error.detail
const detail = String(error.detail);
return { error: translateError(detail) };
```

`translateError()` looks up the key in the messages map and falls back to returning the raw string for unknown keys (e.g. fastapi-users errors like `"LOGIN_BAD_CREDENTIALS"`).

### Adding New Strings

1. Add the key + English text to `i18n/keys.ts` in the appropriate section.
2. Use `t("KEY")` in components/actions/hooks.
3. For backend error keys, add both the key to `i18n/keys.ts` and use `translateError()` at the extraction point.
4. For Zod validation messages, use `t("FORM_VALIDATION_*")` in `lib/definitions.ts`.

Key naming conventions and the full list of prefixes are documented in the root `AGENTS.md`.

## Adding a Frontend Feature

1. **Write a failing test** in `__tests__/`.
2. Create or update the page component in `app/`.
3. If the feature calls the backend, use the typed API client from `openapi-client/`.
4. Extract non-trivial logic into `lib/` or a custom hook -- keep components thin.
5. Use existing shadcn/ui components from `components/ui/` where possible.
6. Run `make test-frontend` (from project root) to verify.
