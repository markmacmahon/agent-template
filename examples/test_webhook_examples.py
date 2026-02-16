#!/usr/bin/env python3
"""
Smoke tests for the webhook examples. Ensures each example server starts,
accepts a POST with the message_received contract, and returns { "reply": "..." }.

Run from project root:
  python3 examples/test_webhook_examples.py
  make test-examples

Uses ports 15980 (Python) and 15981 (Node) so they do not conflict with
manually run examples (8080, 8081).
"""

import json
import os
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPT_DIR)

PYTHON_PORT = 15980
NODE_PORT = 15981

# Minimal payload matching the in-app contract (message_received).
MINIMAL_PAYLOAD = {
    "version": "1.0",
    "event": "message_received",
    "app": {"id": "test-app", "name": "Test"},
    "thread": {"id": "t1", "customer_id": "c1"},
    "message": {
        "id": "m1",
        "seq": 1,
        "role": "user",
        "content": "hello",
        "content_json": {},
    },
    "history_tail": [],
    "timestamp": "2026-01-01T12:00:00Z",
}


def wait_for_port(port: int, timeout_sec: float = 5.0) -> bool:
    """Return True when the port is accepting TCP connections."""
    start = time.monotonic()
    while time.monotonic() - start < timeout_sec:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.5):
                pass
            return True
        except (OSError, socket.error):
            time.sleep(0.1)
            continue
    return False


def post_and_check(port: int, body: dict) -> tuple[int, dict]:
    """POST JSON body to http://127.0.0.1:port/ and return (status_code, response_body)."""
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        f"http://127.0.0.1:{port}/",
        data=data,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=2) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode() if e.fp else "{}"
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, {}


def test_python_example() -> bool:
    """Start Python webhook server, POST, assert reply, stop. Return True on success."""
    server_dir = os.path.join(ROOT, "examples", "webhook-python")
    server_py = os.path.join(server_dir, "server.py")
    env = {**os.environ, "PORT": str(PYTHON_PORT)}

    proc = subprocess.Popen(
        [sys.executable, server_py],
        cwd=server_dir,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    try:
        if not wait_for_port(PYTHON_PORT):
            return False
        status, body = post_and_check(PYTHON_PORT, MINIMAL_PAYLOAD)
        if status != 200:
            return False
        if body.get("reply") != "Echo: hello":
            return False
        return True
    finally:
        proc.terminate()
        proc.wait(timeout=3)


def test_node_example() -> bool:
    """Start Node webhook server, POST, assert reply, stop. Return True on success."""
    server_dir = os.path.join(ROOT, "examples", "webhook-typescript")
    server_mjs = os.path.join(server_dir, "server.mjs")
    env = {**os.environ, "PORT": str(NODE_PORT)}

    proc = subprocess.Popen(
        ["node", server_mjs],
        cwd=server_dir,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    try:
        if not wait_for_port(NODE_PORT):
            return False
        status, body = post_and_check(NODE_PORT, MINIMAL_PAYLOAD)
        if status != 200:
            return False
        if body.get("reply") != "Echo: hello":
            return False
        return True
    finally:
        proc.terminate()
        proc.wait(timeout=3)


def main() -> int:
    print("Testing webhook-python (port %d)..." % PYTHON_PORT)
    if not test_python_example():
        print("FAIL webhook-python")
        return 1
    print("  OK")

    print("Testing webhook-typescript (port %d)..." % NODE_PORT)
    if not test_node_example():
        print("FAIL webhook-typescript")
        return 1
    print("  OK")

    print("All webhook examples passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
