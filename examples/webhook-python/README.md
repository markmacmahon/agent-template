# Minimal Python webhook

Standard library only. No frameworks or extra dependencies.

- **Port:** 8080 by default. Override with `PORT` (e.g. `PORT=9090 python server.py`).
- **Endpoint:** `POST /` (root path).

## Run

```bash
cd examples/webhook-python
python server.py
```

Server listens on `http://0.0.0.0:8080`. For local testing with the main app, use `http://localhost:8080` as the App’s webhook URL. For a remote main app, expose this server (e.g. ngrok) and use that URL.

## Optional: verify HMAC signing

Set `WEBHOOK_SECRET` in the environment to the same value as your App’s webhook secret. The server will verify `X-Signature` and `X-Timestamp` and return 401 if the signature is invalid.
