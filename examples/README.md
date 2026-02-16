# Webhook examples

Minimal reference implementations of the partner webhook contract. Use these to build your own integration in Python or TypeScript.

**Run each example in a separate process.** They use different ports so they do not conflict with the main app (frontend `3000`, backend `8000`).

| Example            | Port | How to run                          |
|--------------------|------|-------------------------------------|
| **webhook-python** | 8080 | `cd webhook-python && python server.py` |
| **webhook-typescript** | 8081 | `cd webhook-typescript && node server.mjs` |

## Connecting the main app

1. Start the main app (from project root: `make start-backend`, `make start-frontend`).
2. In another terminal, start **one** of the examples (e.g. `python examples/webhook-python/server.py`).
3. With the default `BACKEND_URL=http://localhost:8000`, the backend allows webhook URLs to the same host (localhost), so you can use `http://localhost:8080` or `http://localhost:8081` without changing config.
4. In the dashboard: create or edit an App → set integration mode to **Webhook** → set **Webhook URL** to `http://localhost:8080` (Python) or `http://localhost:8081` (TypeScript) → save.
5. Optionally set **Webhook secret** and use the same secret in the example for HMAC verification (see each example’s README).

## Contract (sync)

- **Request:** `POST` with `Content-Type: application/json`. Body shape:
  - `version`, `event` (`"message_received"`), `app` (`id`, `name`), `thread` (`id`, `customer_id`), `message` (`id`, `seq`, `role`, `content`, `content_json`), `history_tail` (array of `{ role, content, content_json }`), `timestamp`.
- **Response:** `200` with JSON `{ "reply": "your assistant reply text" }`.
- **Signing (optional):** If the App has a webhook secret, the main app sends `X-Timestamp` and `X-Signature` (HMAC-SHA256 of `{timestamp}.{raw_body}`). Examples show how to verify.

See the main app’s in-app webhook docs and `docs/system-overview.md` for full details.
