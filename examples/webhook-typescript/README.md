# Minimal TypeScript (Node) webhook

Node built-in `http` only. No frameworks. Run with Node (no build step).

- **Port:** 8081 by default. Override with `PORT` (e.g. `PORT=9091 node server.mjs`).
- **Endpoint:** `POST /` (root path).

## Run

```bash
cd examples/webhook-typescript
node server.mjs
```

Server listens on `http://0.0.0.0:8081`. For local testing with the main app, use `http://localhost:8081` as the App’s webhook URL. For a remote main app, expose this server (e.g. ngrok) and use that URL.

## Optional: verify HMAC signing

Set `WEBHOOK_SECRET` in the environment to the same value as your App’s webhook secret. The server will verify `X-Signature` and `X-Timestamp` and return 401 if the signature is invalid.
