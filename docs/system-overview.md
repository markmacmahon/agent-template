# System Overview

This document provides a comprehensive overview of the Partner Integration Platform — a full-stack system where partners build conversational agents that plug into existing chatbots. It is intended as a reference for collaborators joining the project.

## What This System Does

The platform lets **partners** (business owners, developers) create **Apps** — each App is the partner's integration point into the chatbot ecosystem. Through their App, partners handle customer **Q&A** (answering questions within their domain) or **agent-to-agent workflows** (transactional flows like booking, ordering, or support) as a skill within the host conversation. **Subscribers** (end customers) interact through threaded conversations. Messages flow through a configurable integration layer that can use a built-in simulator for testing or forward to an external webhook for production AI/LLM processing. The chat interface supports real-time streaming via Server-Sent Events (SSE).

---

## User-Facing Capabilities

These are the features available through the web UI at `http://localhost:3000`.

### Authentication

| Feature | Description |
|---------|-------------|
| Registration | Email + password with validation (8+ chars, uppercase, special character) |
| Login | Email/password with JWT token stored in httpOnly cookie |
| Forgot password | Email-based recovery flow with reset token |
| Password reset | Token-validated new password form |
| Logout | Token cleanup and redirect |

### Partner Dashboard

The dashboard is the main workspace after login. It has a fixed left sidebar and breadcrumb navigation.

- **Landing page** — Welcome copy with a CTA to the Apps list.
- **Apps table** — Paginated list of all apps owned by the user. Columns: name (links to app detail page), description, and actions (Chat, Subscribers, Edit, Delete via dropdown).
- **Page size selector** — 10, 20, 50, or 100 items per page.

### App Management

| Action | Description |
|--------|-------------|
| Create app | Name, description, integration mode (simulator or webhook), simulator scenario preset, webhook URL; when webhook is selected, optional **App ID & Secret** section (set or generate a secret at creation so the app can use the Partner API without login) |
| View app | Hub page with links to Chat, Subscribers, and Edit |
| Edit app | All fields editable; **App ID & Secret** section when webhook is selected (App ID read-only + copy, webhook secret with Generate/Copy/Clear); webhook testing UI; webhook contract and **Partner API** documentation; streaming docs. Primary CTA when webhook: **Save app & credentials**. |
| Delete app | Confirmation dialog; cascades to all threads, messages, and subscribers |

### Integration Modes

Each app is configured with one of two integration modes, which control how assistant responses are generated:

**Simulator** (default) — No external dependencies. Generates deterministic canned responses for testing.
- Scenario presets (customer support triage, live match commentary, restaurant reservation, survey) are selectable in the dashboard. Each preset streams canned responses chunk-by-chunk with timed delays so teams can demo long-running workflows end-to-end.
- Optional `[Simulated]` disclaimer prefix.

**Webhook** — Forwards user messages to an external URL and returns the response.
- Sync mode: POST to webhook, expect `{ "reply": "..." }` within timeout.
- Supports HMAC-SHA256 request signing for authenticity verification.
- Supports SSE streaming responses from the webhook (proxied to the user).
- Webhook test UI: send a sample message, view status code, latency, response, and signature status.
- In-app documentation with request/response contract, code examples (Node.js Express, Python FastAPI), and signing verification guides.
- **Partner API**: When the app has a webhook secret set, the edit page shows a **Partner API** section with base URL and App ID, and documents **App ID + Secret** auth (headers `X-App-Id` and `X-App-Secret`) so partners can call the API (list subscribers, list threads, post messages) without logging in. If no secret is set, the doc shows the JWT (login) flow instead.

### Chat Interface

A real-time conversational UI accessible from any app. Dashboard routes: thread list at `apps/[app_id]/threads` (or via Chat from the app page), conversation at `apps/[app_id]/threads/[thread_id]`.

- **Thread-based** — Each conversation is a thread with sequential messages.
- **Auto-greeting** — A greeting message from the assistant is created when a new thread starts.
- **SSE streaming** — Assistant responses stream token-by-token with an animated cursor.
- **Collapsible sidebar** — Lists all threads for the app; toggle with the menu button.
- **New conversation** — Create threads via the "+" button.
- **Editable titles** — Rename threads inline.
- **Auto-resize input** — Message input grows from 44px to 200px.
- **Smart scrolling** — Auto-scrolls to bottom; scroll-to-bottom button when scrolled up.
- **Keyboard shortcuts** — Enter sends, Shift+Enter adds newline.
- **Mobile responsive** — Overlay sidebar on small screens.

### Subscribers (Customer Conversations)

A 3-panel layout for viewing conversations grouped by customer:

- **Left panel** — Subscriber list with search (by customer ID or display name).
- **Middle panel** — Threads for the selected subscriber.
- **Right panel** — Conversation view for the selected thread.
- Accessible from the apps table (Users icon) or the app detail page.

### Internationalisation (i18n)

- All UI strings are centralised in `frontend/i18n/keys.ts`.
- Supported locales: English (`en`), Spanish (`es`), Portuguese (`pt`). Translations are not yet implemented — the infrastructure is in place.
- Backend HTTP errors return raw i18n key strings; the frontend `translateError()` maps them to user-facing text.
- User locale is stored on the user record and exposed via the API.

---

## Technical Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16+ (App Router), React 19, TypeScript (strict), Tailwind CSS v4, shadcn/ui |
| Backend | Python 3.12, FastAPI (async/await), Pydantic |
| Database | PostgreSQL 17 (async via asyncpg + SQLAlchemy) |
| Auth | fastapi-users (JWT + password recovery) |
| Migrations | Alembic |
| Package managers | pnpm (frontend), uv (backend) |
| Containers | Docker Compose (databases, MailHog) |
| CI | GitHub Actions |
| Deployment | Vercel (frontend + backend) |

### Monorepo Structure

```
agent-template/
├── backend/              # FastAPI app
│   ├── app/
│   │   ├── main.py       # App entrypoint, route registration, CORS
│   │   ├── config.py     # Pydantic settings from .env
│   │   ├── models.py     # SQLAlchemy ORM (User, App, Thread, Message, Subscriber)
│   │   ├── schemas.py    # Pydantic request/response schemas
│   │   ├── users.py      # fastapi-users auth configuration
│   │   ├── email.py      # Password reset email via FastMail
│   │   ├── database.py   # Async engine, session factory
│   │   ├── dependencies.py # Auth + ownership; get_app_for_request (JWT or X-App-Id + X-App-Secret) for Partner API
│   │   ├── routes/       # HTTP endpoints (apps, threads, messages, run, subscribers, webhook_test)
│   │   ├── services/     # Domain logic (orchestrator, simulator, webhook_client, webhook_signing, message_service)
│   │   └── i18n/         # Backend-internal translated strings
│   ├── alembic_migrations/
│   └── tests/
├── frontend/             # Next.js app
│   ├── app/              # Pages (App Router)
│   ├── components/       # UI components + server actions
│   ├── hooks/            # Custom React hooks (chat stream, scroll)
│   ├── i18n/             # UI string translations
│   ├── lib/              # Utilities, types, config
│   ├── e2e/              # Playwright E2E tests
│   └── __tests__/        # Jest unit tests
├── docker-compose.yml    # PostgreSQL (dev:5432, test:5433), MailHog
├── Makefile              # Single operational interface
└── local-shared-data/    # Shared OpenAPI schema (auto-generated)
```

### Database Models

| Model | Key Fields | Relationships |
|-------|-----------|---------------|
| **User** | id (UUID), email, hashed_password, locale, is_active | Has many Apps |
| **App** | id, name, description, webhook_url, webhook_secret, config_json (JSONB) | Belongs to User; has many Threads, Subscribers |
| **Thread** | id, app_id, subscriber_id, title, status, customer_id, next_seq | Belongs to App, Subscriber; has many Messages |
| **Message** | id, thread_id, seq, role (user/assistant/system/tool), content, content_json | Belongs to Thread |
| **Subscriber** | id, app_id, customer_id, display_name, metadata_json, last_seen_at | Belongs to App; has many Threads |

Key constraints:
- Message `(thread_id, seq)` is unique — enforced at DB level.
- Subscriber `(app_id, customer_id)` is unique.
- Cascade deletes: App -> Threads -> Messages; App -> Subscribers.
- Indexes: `(app_id, created_at)` and `(app_id, customer_id)` on threads; `(thread_id, seq)` on messages; `(app_id, last_seen_at)` and `(app_id, last_message_at)` on subscribers.

#### Message Sequencing

Messages use a concurrency-safe sequence allocation mechanism:

1. Lock thread row: `SELECT ... FOR UPDATE`
2. Read `threads.next_seq`
3. Increment `next_seq`, update `updated_at`
4. Insert message with allocated `seq`
5. Commit transaction

This guarantees no duplicate seq numbers under concurrent writes, deterministic ordering for the chat UI, and efficient cursor pagination.

#### Authorization

- **Dashboard and app-scoped routes** (e.g. `/apps/{id}`, `/threads/{id}`): JWT required; ownership enforced via `app.user_id == current_user.id`.
- **Partner API routes** (under `/apps/{app_id}/...`): **Subscribers** (list, get, list threads), **Threads** (create, list), and **Messages** (list, create user, create assistant) accept **either**:
  - **JWT** — `Authorization: Bearer <token>` (same as dashboard), or
  - **App ID + Secret** — headers `X-App-Id` (app UUID) and `X-App-Secret` (the app’s webhook secret). The app must have a webhook secret set. Validated with constant-time comparison.
- So partners can integrate without storing user credentials: they use the App ID (shown on the app edit page) and the webhook secret on every request.

### API Endpoints

#### Authentication (fastapi-users)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/jwt/login` | Login, returns JWT |
| POST | `/auth/register` | Register new user |
| POST | `/auth/forgot-password` | Request password reset email |
| POST | `/auth/reset-password` | Reset password with token |
| GET | `/users/me` | Current user profile |
| PATCH | `/users/{id}` | Update user (locale, password) |

#### Apps

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/apps/` | List apps (paginated) |
| POST | `/apps/` | Create app |
| GET | `/apps/{id}` | Get app |
| PATCH | `/apps/{id}` | Update app |
| DELETE | `/apps/{id}` | Delete app |
| POST | `/apps/{id}/webhook/test` | Test webhook configuration |

#### Threads

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/apps/{app_id}/threads` | Create thread (returns greeting message) |
| GET | `/apps/{app_id}/threads` | List threads (filterable by customer_id/status, cursor pagination with `{items,next_cursor}`) |
| GET | `/threads/{id}` | Get thread |
| PATCH | `/threads/{id}` | Update thread |
| DELETE | `/threads/{id}` | Delete thread |

#### Messages

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/apps/{app_id}/threads/{thread_id}/messages` | Send user message |
| POST | `/apps/{app_id}/threads/{thread_id}/messages/assistant` | Send assistant message |
| GET | `/apps/{app_id}/threads/{thread_id}/messages` | List messages (cursor pagination via `before_seq`) |
| GET | `/messages/{id}` | Get single message |

**Threads — request/response:** Create thread `POST /apps/{app_id}/threads` accepts `{ "title": "optional", "customer_id": "optional" }` and returns the thread object (id, app_id, title, status, customer_id, created_at, updated_at). List threads supports query params `customer_id`, `status`, and cursor pagination (`limit`, `cursor`); response `{ "items": [...], "next_cursor": "..." }`.

**Messages — request/response:** Send user message `POST .../messages` body `{ "content": "text", "content_json": {} }`; role is set to `user`. Send assistant reply `POST .../threads/{thread_id}/messages/assistant` same body; role is set to `assistant`. List messages `GET .../messages` accepts `before_seq` (cursor) and `limit` (default 50, max 200); returns an array of message objects ordered by `seq` ascending (oldest first). Each message has id, thread_id, seq, role, content, content_json, created_at.

#### Chat Execution

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/apps/{app_id}/threads/{thread_id}/run` | Sync: process message, return JSON response |
| GET | `/apps/{app_id}/threads/{thread_id}/run/stream` | SSE: stream assistant response as delta events |

SSE event types: `meta` (source info), `delta` (text chunk), `done` (final message ID), `error`.

#### Subscribers

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/apps/{app_id}/subscribers` | List subscribers with `limit` + `cursor` parameters (returns `{items,next_cursor}`) |
| GET | `/apps/{app_id}/subscribers/{id}` | Get subscriber |
| GET | `/apps/{app_id}/subscribers/{id}/threads` | List subscriber threads with cursor pagination |

### Services Layer

| Service | Responsibility |
|---------|---------------|
| **ChatOrchestrator** | Routes messages to simulator or webhook based on app config; handles both sync and streaming |
| **SimulatorHandler** | Generates canned responses (generic echo or e-commerce scenarios) |
| **WebhookClient** | HTTP client for external webhooks; validates URLs (blocks private IPs); supports sync and SSE streaming |
| **WebhookSigning** | HMAC-SHA256 request signing (`X-Timestamp` + `X-Signature` headers) |
| **MessageService** | Atomic message persistence with concurrency-safe seq allocation via `SELECT FOR UPDATE` |

### Webhook Contract

Outbound payload (FastAPI -> external webhook):
```json
{
  "version": "1.0",
  "event": "message_received",
  "app": { "id": "uuid", "name": "string" },
  "thread": { "id": "uuid", "customer_id": "string | null" },
  "message": { "id": "uuid", "seq": 1, "role": "user", "content": "text" },
  "history_tail": [{ "role": "user", "content": "..." }],
  "timestamp": "ISO8601"
}
```

Expected sync response: `{ "reply": "assistant response text" }`

Webhooks can also return `Content-Type: text/event-stream` for SSE streaming, emitting `delta` and `done` events.

### Type Safety Pipeline

End-to-end types are maintained automatically:

1. Python types defined with Pydantic models.
2. FastAPI auto-generates OpenAPI spec -> `local-shared-data/openapi.json`.
3. `@hey-api/openapi-ts` generates TypeScript types in `frontend/lib/openapi-client/`.
4. Frontend uses the typed API client for all backend calls.

File watchers (`backend/watcher.py`, `frontend/watcher.js`) auto-regenerate on changes when using `make start-backend` / `make start-frontend`.

### Security

- JWT authentication on protected endpoints; **Partner API** routes also accept **X-App-Id + X-App-Secret** when the app has a webhook secret (no login required for partners).
- App ownership enforced: users can only access their own apps, threads, messages, and subscribers; app-secret auth grants access only to that app’s resources.
- Webhook URL validation: blocks `localhost`, `127.0.0.1`, private networks (`10.x.x.x`, `192.168.x.x`, `169.254.x.x`).
- HMAC-SHA256 webhook signing for request authenticity.
- Password requirements: 8+ characters, uppercase, special character.
- Webhook secrets masked in API responses (`••••••`).
- CORS configured per environment.
- httpOnly cookies for JWT storage.

### Configuration

Backend settings are loaded from `backend/.env` via Pydantic BaseSettings:

| Variable | Purpose | Default |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `localhost:5432/agents_db` |
| `TEST_DATABASE_URL` | Test database | `localhost:5433/agents_test_db` |
| `ACCESS_SECRET_KEY` | JWT signing secret | Dev default (must override in prod) |
| `RESET_PASSWORD_SECRET_KEY` | Password reset token secret | Dev default |
| `VERIFICATION_SECRET_KEY` | Email verification secret | Dev default |
| `CORS_ORIGINS` | Allowed origins | `localhost:3000`, `localhost:8000` |
| `FRONTEND_URL` | Frontend base URL | `http://localhost:3000` |
| `BACKEND_URL` | Backend base URL; webhook URLs to this host are allowed when it is localhost | `http://localhost:8000` |
| `WEBHOOK_HEADER_APP_ID` | Header name for Partner API app ID | `X-App-Id` |
| `WEBHOOK_HEADER_APP_SECRET` | Header name for Partner API app secret | `X-App-Secret` |
| `MAIL_*` | SMTP settings (MailHog locally) | localhost:1025 |

Frontend settings via `frontend/.env.local`:

| Variable | Purpose | Default |
|----------|---------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend URL (browser) | `http://localhost:8000` |
| `API_BASE_URL` | Backend URL (server-side) | `http://localhost:8000` |

### Testing

| Suite | Framework | Location | Command |
|-------|-----------|----------|---------|
| Backend unit/integration | pytest (async) | `backend/tests/` | `make test-backend` |
| Frontend unit | Jest + React Testing Library | `frontend/__tests__/` | `make test-frontend` |
| E2E | Playwright | `frontend/e2e/` | `make test-e2e` |

E2E tests auto-start both backend and frontend servers. Prerequisites: Docker database running, test user `tester1@example.com` / `Password#99` with at least one app.

E2E test coverage:
- **Chat flow** (5 tests): full send/receive, sidebar toggle, simulator settings, auto-create thread, new conversation.
- **Subscribers flow** (6 tests): navigation, 3-panel layout, app page actions, edit page with Webhook mode (App ID & Secret section and Save app & credentials CTA).

### Development Workflow

```bash
# Start databases
docker compose up -d db

# Run migrations
make docker-migrate-db      # or: cd backend && uv run alembic upgrade head

# Start servers (each auto-kills orphaned processes)
make start-backend          # FastAPI on :8000
make start-frontend         # Next.js on :3000

# Run tests
make test-backend           # pytest (auto-starts test DB)
make test-frontend          # Jest
make test-e2e               # Playwright (auto-starts both servers)

# Before committing
make precommit              # Lint + format + type check
```

### Deployment

- **Frontend**: Vercel or any Node.js host. Set `NEXT_PUBLIC_API_BASE_URL` and `API_BASE_URL`.
- **Backend**: Vercel, Railway, Render, or any Python host. Set database URL, secret keys, CORS origins.
- **Database**: Hosted PostgreSQL (Railway, Supabase, etc.).
- Backend uses `NullPool` for serverless compatibility (no persistent connections).

### API Quick Start (curl)

Register, create an App, and start a conversation using the API directly:

```bash
# Register and login
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"SecurePass123#"}'

curl -X POST http://localhost:8000/auth/jwt/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=owner@example.com&password=SecurePass123#"
# Save the token from the response
export TOKEN="<your-token>"

# Create an App
curl -X POST http://localhost:8000/apps/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Restaurant Booking","description":"Handles table reservations"}'
export APP_ID="<app-id>"

# Create a thread (returns { "thread": {...}, "initial_message": {...} })
curl -X POST http://localhost:8000/apps/$APP_ID/threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Alice Support","customer_id":"alice_123"}'
export THREAD_ID="<thread-id from response.thread.id>"

# Send a user message
curl -X POST http://localhost:8000/apps/$APP_ID/threads/$THREAD_ID/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hi, I need help with my order"}'

# Send an assistant reply (partner agent)
curl -X POST http://localhost:8000/apps/$APP_ID/threads/$THREAD_ID/messages/assistant \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Sure! What is your order number?"}'

# View the conversation
curl http://localhost:8000/apps/$APP_ID/threads/$THREAD_ID/messages \
  -H "Authorization: Bearer $TOKEN"
```

**Partner API (no login):** If the app has a webhook secret set, you can call the same endpoints with headers instead of JWT:

```bash
export APP_ID="<your-app-uuid>"
export APP_SECRET="<webhook-secret-from-app-settings>"

curl -X GET "http://localhost:8000/apps/$APP_ID/subscribers?limit=20" \
  -H "X-App-Id: $APP_ID" \
  -H "X-App-Secret: $APP_SECRET"

curl -X POST http://localhost:8000/apps/$APP_ID/threads/$THREAD_ID/messages/assistant \
  -H "X-App-Id: $APP_ID" \
  -H "X-App-Secret: $APP_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"content":"Partner reply"}'
```

### Chat Flow Diagram

```
User sends message (UI)
    |
    v
ChatContainer -> Creates thread + user message (POST /messages)
    |
    v
GET /run/stream (SSE connection)
    |
    v
Orchestrator -> resolves integration mode from app config
    |
    +-- Simulator: generates canned response
    +-- Webhook:   POST to external URL, proxy response
    |
    v
SSE events stream to frontend:
  - meta:  { source: "simulator" | "webhook" }
  - delta: { text: "chunk" }  (multiple events)
  - done:  { status: "completed", message_id: "uuid" }
    |
    v
Frontend displays streaming text with animated cursor
    |
    v
On done: message persisted to database
```
