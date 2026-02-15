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
├── lib/
│   ├── clientConfig.ts      # API client configuration
│   ├── definitions.ts       # Shared TypeScript types
│   └── utils.ts             # Utility functions
├── __tests__/               # Jest test suite
├── package.json
└── start.sh                 # Dev server startup script
```

## Commands

From the **project root**:
```bash
make start-frontend         # Start Next.js dev server on :3000
make test-frontend          # Run Jest tests
make precommit              # Lint + format + type check
```

From `frontend/` directly (when needed):
```bash
pnpm install                # Install dependencies
pnpm run dev                # Start dev server
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

Run this after any backend route changes. Never manually write API types -- they come from the generated client in `app/openapi-client/`.

## Adding a Frontend Feature

1. **Write a failing test** in `__tests__/`.
2. Create or update the page component in `app/`.
3. If the feature calls the backend, use the typed API client from `openapi-client/`.
4. Extract non-trivial logic into `lib/` or a custom hook -- keep components thin.
5. Use existing shadcn/ui components from `components/ui/` where possible.
6. Run `make test-frontend` (from project root) to verify.
