#!/usr/bin/env python3
"""
Minimal webhook server (stdlib only). Implements the sync contract:
POST JSON body with message_received payload -> respond with { "reply": "..." }.
Port 8080 to avoid conflict with main app (3000, 8000).
"""
import hmac
import hashlib
import json
import os
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = 8080


def verify_signature(secret: str, raw_body: bytes, timestamp: str, signature: str) -> bool:
    if not secret or not timestamp or not signature:
        return True
    try:
        signed = f"{timestamp}.{raw_body.decode()}"
        expected = "sha256=" + hmac.new(
            secret.encode(), signed.encode(), hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(signature, expected)
    except Exception:
        return False


class WebhookHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        raw = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        secret = os.environ.get("WEBHOOK_SECRET", "")
        ts = self.headers.get("X-Timestamp", "")
        sig = self.headers.get("X-Signature", "")
        if secret and not verify_signature(secret, raw, ts, sig):
            self.send_response(401)
            self.end_headers()
            return
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"error":"Invalid JSON"}')
            return
        msg = data.get("message", {})
        content = msg.get("content", "") or ""
        reply = f"Echo: {content}"
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"reply": reply}).encode())

    def log_message(self, format, *args):
        print(f"[webhook] {args[0]}")


def main():
    server = HTTPServer(("0.0.0.0", PORT), WebhookHandler)
    print(f"Webhook listening on http://0.0.0.0:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
