# Work In Progress - ChatBot Application Starter

## Current Status

**Stable** — Dedicated app page, Partner Dashboard landing, apps table with Chat/Subscribers links and actions dropdown.

## Recent Changes

### 2026-02-15 - Docs and terminology

- **Docs:** Removed standalone Subscribers doc; Subscribers summary and 3-panel layout moved into README. No "inbox" terminology.
- **E2E:** Comment in subscribers-flow.spec.ts updated (3-panel layout).

### 2026-02-15 - Dashboard and apps table

- **Dedicated app page** at `/dashboard/apps/[id]` (hub: Chat, Subscribers, Edit App). App name in list links to app page; Edit via dropdown or app page.
- **Partner Dashboard** landing (title, agent apps copy, Go to Apps CTA). Sidebar retained.
- **Apps table:** Chat and Subscribers as icon links; actions dropdown (Edit App, Delete). App name link with hover underline/primary.

### Earlier - Subscribers and tests

- Subscribers page at `/dashboard/apps/[id]/subscribers` (3-panel layout). i18n uses `SUBSCRIBERS_*` keys. E2E and unit tests for subscribers flow.
- Boyscout rule in AGENTS.md; SSE/chat-flow test fixes; i18n error-key contract.

## Key Architecture Decisions

### i18n Error-Key Contract

Backend returns raw i18n keys in HTTP errors; frontend `translateError()` maps to English. See root `AGENTS.md`.

### i18n file locations

| File | Purpose |
|------|---------|
| `frontend/i18n/keys.ts` | All UI text + backend error key translations |
| `backend/app/i18n/keys.py` | Backend-internal strings only |

## Test Counts (after subscribers tests)

| Suite | Count (approx) |
|-------|-----------------|
| Backend (pytest) | 137 |
| Frontend (jest) | 176 + 19 subscriber tests |
| E2E (playwright) | 8 (6 chat + 2 subscribers) |
| **Total** | See `make test-backend` / `make test-frontend` / `make test-e2e` |

## Upcoming

- Fix any flaky or failing frontend unit tests (use-chat-stream, chat-flow integration) if still present.
- Optional: file attachments, message actions, markdown in messages, search, keyboard nav.
