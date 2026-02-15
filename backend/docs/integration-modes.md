# Integration Modes

This document describes the four integration modes supported by the chat backend and how they interact with the transport layer (JSON vs SSE).

## Architecture Overview

```
Client (UI)
   │
   ├── POST /apps/{id}/threads/{tid}/run          (sync JSON)
   └── GET  /apps/{id}/threads/{tid}/run/stream    (SSE)
           │
       ┌───┴───┐
       │ Route  │   ← thin HTTP layer
       └───┬───┘
           │
       ┌───┴──────────┐
       │ Orchestrator  │   ← routes by integration mode
       └───┬──────────┘
           │
     ┌─────┼────────┬──────────────┐
     │     │        │              │
  Simulator  SyncWebhook  AsyncWebhook  Hybrid
```

**Key invariant**: The UI never calls external webhooks directly. All assistant responses flow through FastAPI, which persists messages, applies policy, and controls the response format.

## Integration Modes

### 1. `simulator` (default)

- **Purpose**: Testing and development without external dependencies.
- **Behavior**: `SimulatorHandler` generates deterministic canned responses based on the configured scenario (`generic`, `ecommerce_support`).
- **Config**: `config_json.simulator.scenario`, `config_json.simulator.disclaimer`
- **SSE**: Streams reply as `delta` events, then `done` with persisted message ID.
- **JSON**: Returns `{ "status": "completed", "assistant_message": {...} }`.

### 2. `webhook_sync`

- **Purpose**: Real-time webhook integration where the external system responds immediately.
- **Behavior**: FastAPI POSTs to `webhook_url` with message context. Expects `{ "reply": "text" }` back within `timeout_ms`.
- **On failure**: Returns error to client (no fallback).
- **SSE**: Streams webhook reply as `delta` events, then `done`.
- **JSON**: Returns `{ "status": "completed", "assistant_message": {...} }`.

### 3. `webhook_async`

- **Purpose**: When the business processes messages offline or through a queue.
- **Behavior**:
  1. FastAPI POSTs `{ "event": "message_received", ... }` to `webhook_url` (fire-and-forget).
  2. Returns `pending` status immediately.
  3. The business later calls `POST /apps/{id}/threads/{tid}/messages/assistant` to submit the reply.
- **SSE**: Emits `event: status` with `{ "state": "pending_webhook" }`, then `done`.
- **JSON**: Returns `{ "status": "pending", "assistant_message": null }`.
- **No message persisted** until the business calls the assistant-message endpoint.

### 4. `hybrid`

- **Purpose**: Sync webhook with automatic simulator fallback on failure.
- **Behavior**: Attempts `webhook_sync`. If the webhook times out or returns an error, falls back to `simulator` mode transparently.
- **SSE/JSON**: Same format as whichever handler responds (webhook or simulator).

## Webhook Contract

### Outbound payload (FastAPI → external)

```json
{
  "app_id": "uuid",
  "thread_id": "uuid",
  "customer_external_id": "string | null",
  "message": { "content": "user message text" },
  "event": "message_received"  // only for webhook_async
}
```

### Expected response (sync)

```json
{ "reply": "assistant response text" }
```

## Security

- `webhook_url` is validated: only `http`/`https` schemes allowed.
- Blocked hosts: `localhost`, `127.0.0.1`, `169.254.x.x`, `10.x.x.x`, `192.168.x.x`.
- All endpoints enforce app ownership via JWT authentication.
- Webhook failures are logged but never leak internal details to the client.

## Transport vs Integration Mode

Transport (SSE vs JSON) is **orthogonal** to integration mode:

| | JSON (`POST /run`) | SSE (`GET /run/stream`) |
|---|---|---|
| **simulator** | completed + message | delta chunks → done |
| **webhook_sync** | completed + message | delta chunks → done |
| **webhook_async** | pending | status(pending_webhook) → done |
| **hybrid** | completed + message | delta chunks → done |

## App Configuration

Set via `PATCH /apps/{id}`:

```json
{
  "webhook_url": "https://your-service.com/webhook",
  "config_json": {
    "integration": { "mode": "hybrid" },
    "webhook": { "timeout_ms": 8000 },
    "simulator": {
      "scenario": "ecommerce_support",
      "latency_ms": 500,
      "disclaimer": true
    }
  }
}
```
