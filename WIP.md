# Work In Progress - ChatBot Application Starter

## Current Status

**STABLE** — All tests passing (132 backend, 167 frontend, 6 E2E), `make precommit` clean.

## Recent Changes

### 2026-02-15 (Evening) - Boyscout Rule & SSE Refetch Bug Fix

- **Boyscout rule** added to `AGENTS.md`
  - ✅ Added as #7 in Non-Negotiables: "always fix issues when you find them, unless explicitly told otherwise"
  - ✅ Integrated into AI agent workflow section
- **Critical SSE message refetch bug fixed**
  - ✅ Fixed React stale closure in `chat-container.tsx` where `onMessageComplete` callback captured outdated `selectedThreadId` (null)
  - ✅ Changed to use `message.thread_id` from parameter instead of closure
  - ✅ Assistant messages now appear correctly after streaming completes
  - ✅ All 6 E2E tests passing (was 3 failing)
- **Code cleanup**
  - ✅ Removed unused `refetchMessages` callback
  - ✅ Removed unused `SSEMetaEvent` type
  - ✅ Removed debug console.log statements

### 2026-02-15 (Late PM) - i18n, Lint Cleanup & E2E Fix

- **Internationalisation (i18n) — full codebase coverage**
  - ✅ Frontend `i18n/keys.ts` — single source of truth for all UI strings (130+ keys), `t()` helper
  - ✅ Backend `app/i18n/keys.py` — internal-only strings (webhook, simulator, email), `t()` helper
  - ✅ **Error-Key Contract**: Backend returns raw i18n keys (`ERROR_APP_NOT_FOUND`, etc.) in HTTP error responses; frontend `translateError()` maps them to user-facing English text
  - ✅ All frontend components migrated from hardcoded strings to `t()` calls
  - ✅ Frontend server actions use `translateError()` for backend errors
  - ✅ Zod validation schemas (`lib/definitions.ts`) use `t()` for messages
  - ✅ Backend routes return raw keys for all HTTPException detail fields
  - ✅ Backend internal services (simulator, webhook_client, email) use `t()`
  - ✅ `AGENTS.md` (root, backend, frontend) updated with i18n architecture docs
- **Lint & type fixes**
  - ✅ Fixed TS2345 in `edit-app-form.tsx` — `contractTab` union type on tab array
  - ✅ Removed all `any` types from test files and hooks (`use-chat-stream.ts`)
  - ✅ Removed unused vars/imports across test and E2E files
  - ✅ Fixed `no-useless-escape` in E2E regex
- **E2E test fix**
  - ✅ Updated `chat-flow.spec.ts` selectors from stale `div[class*="bg-muted"]` to `[data-testid="message-assistant"]` (was broken by earlier ai-chatbot styling refactor)

### 2026-02-15 (PM) - Chat UI Overhaul & Auth Fix

- **Frontend chat UI completely modernized** to match ai-chatbot reference design
  - ✅ Real-time SSE streaming with token-by-token message display
  - ✅ Modern auto-resize message input (44px min, 200px max)
  - ✅ Collapsible sidebar with slide animations (hidden by default)
  - ✅ Smart scroll management with scroll-to-bottom button
  - ✅ Full-width centered layout (max-w-4xl)
  - ✅ Streaming cursor animation
  - ✅ Mobile-responsive with overlay sidebar
  - ✅ Welcome message on empty state
  - ✅ **Authentication fixed**: All API calls now use server actions with proper auth
- **New custom hooks**:
  - `useChatStream`: SSE EventSource management, streaming state
  - `useScroll`: Auto-scroll detection, scroll-to-bottom functionality
- **Server actions for chat** (`components/actions/chat-actions.ts`):
  - `fetchThreads`, `createNewThread`, `fetchMessages`, `sendMessage`
- **Component refactoring**:
  - `ChatContainer`: Uses server actions instead of direct API calls
  - `MessageList`: Scroll management, streaming support, better layout
  - `MessageInput`: Modern design with auto-resize, keyboard shortcuts
- **Documentation**: Consolidated into proper locations
  - `TESTING.md` - Concise testing guide
  - `frontend/AGENTS.md` - OpenAPI auto-sync workflow, i18n guide
  - `backend/AGENTS.md` - Make target best practices, i18n guide

### 2026-02-15 (AM) - Backend Integration

- **Chat orchestration system** (backend)
  - `ChatOrchestrator` — central routing for all integration modes
  - `SimulatorHandler` (echo + ecommerce_support scenarios, disclaimer support)
  - `WebhookClient` with URL validation (blocks localhost, private IPs)
  - `POST /run` (sync JSON) and `GET /run/stream` (SSE) endpoints
  - Four integration modes: `simulator`, `webhook_sync`, `webhook_async`, `hybrid`
  - Hybrid mode: sync webhook with automatic simulator fallback on failure
- **Data model** — `webhook_url`, `webhook_secret`, `config_json` (JSONB) on App
- **Alembic migration** for new App columns

### 2026-02-14

- Added edit app page at `/dashboard/apps/[id]/edit`
- Restructured URLs: `/dashboard/apps/new`, `/dashboard/apps/{id}/edit`
- Dynamic breadcrumbs with context-based page titles
- Backend `GET /apps/{id}` and `PATCH /apps/{id}` endpoints

## Key Architecture Decisions

### i18n Error-Key Contract

The backend **never** returns translated English text in HTTP error responses. Instead it returns raw i18n keys:

```python
raise HTTPException(status_code=404, detail="ERROR_APP_NOT_FOUND")
```

The frontend `translateError()` in `i18n/keys.ts` maps these to English. This keeps the backend language-neutral and mirrors how `fastapi-users` returns keys like `LOGIN_BAD_CREDENTIALS`.

**Backend `t()` is only used for**: simulator responses, webhook-client internal exceptions (logged), email subjects — strings the backend itself renders.

### i18n File Locations

| File | Purpose |
|------|---------|
| `frontend/i18n/keys.ts` | All UI text + backend error key translations |
| `backend/app/i18n/keys.py` | Backend-internal strings only |

## Test Counts

| Suite | Count |
|-------|-------|
| Backend (pytest) | 132 |
| Frontend (jest) | 167 |
| E2E (playwright) | 6 |
| **Total** | **305** |

## Upcoming

- Optional enhancements:
  - File attachments in chat
  - Message actions (copy, regenerate, delete)
  - Markdown rendering in messages
  - Search within threads
  - Keyboard navigation
