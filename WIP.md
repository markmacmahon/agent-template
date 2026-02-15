# Work In Progress - ChatBot Application Starter

## Current Focus

Backend webhook integration and chat orchestration system.

## Recent Changes

### 2026-02-15

- **Chat orchestration system** (backend)
  - Added `ChatOrchestrator` -- central routing for all integration modes
  - Implemented `SimulatorHandler` (echo + ecommerce_support scenarios, disclaimer support)
  - Implemented `WebhookClient` with URL validation (blocks localhost, private IPs)
  - Added `POST /run` (sync JSON) and `GET /run/stream` (SSE) endpoints
  - Four integration modes: `simulator`, `webhook_sync`, `webhook_async`, `hybrid`
  - Hybrid mode: sync webhook with automatic simulator fallback on failure
- **Data model** -- added `webhook_url`, `webhook_secret`, `config_json` (JSONB) to App
- **Alembic migration** for new App columns
- **Tests**: 83 backend tests (40 new), 103 frontend tests
- **Docs**: `backend/docs/integration-modes.md` architectural reference

### 2026-02-14

- Added edit app page at `/dashboard/apps/[id]/edit`
- Restructured URLs: `/dashboard/apps/new`, `/dashboard/apps/{id}/edit`
- Dynamic breadcrumbs with context-based page titles
- Backend `GET /apps/{id}` and `PATCH /apps/{id}` endpoints

## Upcoming

- Wire frontend chat UI to `/run/stream` SSE endpoint
- Build chat widget component for per-app conversations
- Add latency_ms simulation delay to SimulatorHandler
- Add webhook_secret HMAC signature verification
