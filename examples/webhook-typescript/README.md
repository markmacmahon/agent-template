# Minimal TypeScript (Node) webhook

Node built-in `http` only. No frameworks. Run with Node (no build step).

- **Port:** 8081 (no conflict with main app: frontend 3000, backend 8000).
- **Endpoint:** `POST /` (or `/webhook`; edit `server.mjs` if you want a path).

## Run

```bash
cd examples/webhook-typescript
node server.mjs
```

Server listens on `http://0.0.0.0:8081`. Use a tunnel (e.g. ngrok) to expose it to the main app.

## Optional: verify HMAC

Set `WEBHOOK_SECRET` in the environment to the same value as your App’s webhook secret. The server will verify `X-Signature` and `X-Timestamp` and return 401 if invalid.
