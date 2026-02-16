# Minimal Python webhook

Standard library only. No frameworks or dependencies.

- **Port:** 8080 (no conflict with main app: frontend 3000, backend 8000).
- **Endpoint:** `POST /` (or `/webhook` if you prefer; edit `server.py`).

## Run

```bash
cd examples/webhook-python
python server.py
```

Server listens on `http://0.0.0.0:8080`. Use a tunnel (e.g. ngrok) to expose it to the main app.

## Optional: verify HMAC

Set `WEBHOOK_SECRET` in the environment to the same value as your App’s webhook secret. The server will verify `X-Signature` and `X-Timestamp` and return 401 if invalid.
