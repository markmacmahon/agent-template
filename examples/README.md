# Webhook examples

Minimal reference implementations of the partner webhook contract. Use them to build your own integration or to test the platform with a real webhook.

**Each example runs in a separate process** and uses its own port so it does not conflict with the main app (frontend 3000, backend 8000).

| Example              | Port (default) | How to run |
|----------------------|----------------|------------|
| **webhook-python**   | 8080           | `cd examples/webhook-python && python server.py` |
| **webhook-typescript** | 8081         | `cd examples/webhook-typescript && node server.mjs` |

You can override the port with the `PORT` environment variable (e.g. `PORT=9090 python server.py`).

---

## Quick start: connect an example to the main app

1. **Start the main app** (from project root):
   ```bash
   make start-backend
   make start-frontend
   ```

2. **Start one webhook example** (in another terminal):
   ```bash
   # Python (port 8080)
   cd examples/webhook-python && python server.py

   # or TypeScript/Node (port 8081)
   cd examples/webhook-typescript && node server.mjs
   ```

3. **In the dashboard:** Create or edit an App → set integration mode to **Webhook** → set **Webhook URL** to `http://localhost:8080` (Python) or `http://localhost:8081` (TypeScript) → save.

4. **Test:** Open the app’s Chat and send a message. The example echoes the message back.

---

## Contract (sync)

- **Request:** `POST` with `Content-Type: application/json`. Body includes:
  - `version`, `event` (`"message_received"`), `app`, `thread`, `message` (with `content`), `history_tail`, `timestamp`.
- **Response:** `200` with JSON `{ "reply": "your assistant reply text" }`.
- **Signing (optional):** If the App has a webhook secret, the main app sends `X-Timestamp` and `X-Signature` (HMAC-SHA256 of `{timestamp}.{raw_body}`). Set `WEBHOOK_SECRET` in the example’s environment to the same value to verify; see each example’s README.

Full details: in-app webhook docs (Edit App → Webhook contract) and [docs/system-overview.md](../docs/system-overview.md).

---

## Testing the examples

Smoke tests start each server, send a minimal contract payload, and assert the response. Run from project root:

```bash
make test-examples
```

Or directly:

```bash
python3 examples/test_webhook_examples.py
```

Requires Python 3 and Node.js to be installed. Uses ports 15980 (Python) and 15981 (Node) so they do not conflict with manually run examples.
