"""Tests for /run (sync) and /run/stream (SSE) endpoints."""

import json

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


async def _create_app_and_thread(
    test_client: AsyncClient,
    headers: dict,
    app_config: dict | None = None,
) -> tuple[str, str]:
    """Helper: create app (with optional config) and thread, return (app_id, thread_id)."""
    app_data = {"name": "Run Test App"}
    if app_config:
        app_data.update(app_config)
    app_resp = await test_client.post("/apps/", json=app_data, headers=headers)
    assert app_resp.status_code == 200
    app_id = app_resp.json()["id"]

    thread_resp = await test_client.post(
        f"/apps/{app_id}/threads",
        json={"title": "Test Thread", "customer_id": "cust-1"},
        headers=headers,
    )
    assert thread_resp.status_code == 200
    thread_id = thread_resp.json()["id"]

    return app_id, thread_id


async def _send_user_message(
    test_client: AsyncClient, headers: dict, app_id: str, thread_id: str, content: str
) -> dict:
    resp = await test_client.post(
        f"/apps/{app_id}/threads/{thread_id}/messages",
        json={"content": content},
        headers=headers,
    )
    assert resp.status_code == 200
    return resp.json()


# --- Sync /run endpoint ---


@pytest.mark.asyncio
async def test_run_sync_simulator_mode(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """POST /run with simulator mode returns completed + assistant message."""
    headers = authenticated_user["headers"]
    app_id, thread_id = await _create_app_and_thread(test_client, headers)

    # Send a user message first
    await _send_user_message(test_client, headers, app_id, thread_id, "Hello!")

    # Run
    response = await test_client.post(
        f"/apps/{app_id}/threads/{thread_id}/run",
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["assistant_message"] is not None
    assert data["assistant_message"]["role"] == "assistant"
    assert data["assistant_message"]["content"] is not None
    assert data["assistant_message"]["seq"] == 2  # user was seq 1


@pytest.mark.asyncio
async def test_run_sync_persists_assistant_message(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """POST /run persists the assistant message in the thread."""
    headers = authenticated_user["headers"]
    app_id, thread_id = await _create_app_and_thread(test_client, headers)
    await _send_user_message(test_client, headers, app_id, thread_id, "Test")

    await test_client.post(
        f"/apps/{app_id}/threads/{thread_id}/run", headers=headers
    )

    # Verify message is persisted
    msgs_resp = await test_client.get(
        f"/apps/{app_id}/threads/{thread_id}/messages", headers=headers
    )
    messages = msgs_resp.json()
    assert len(messages) == 2
    assert messages[0]["role"] == "user"
    assert messages[1]["role"] == "assistant"


@pytest.mark.asyncio
async def test_run_sync_no_messages_error(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """POST /run with no user messages returns error."""
    headers = authenticated_user["headers"]
    app_id, thread_id = await _create_app_and_thread(test_client, headers)

    response = await test_client.post(
        f"/apps/{app_id}/threads/{thread_id}/run", headers=headers
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_run_sync_unauthorized(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """POST /run for a non-existent app returns 404."""
    headers = authenticated_user["headers"]
    import uuid

    response = await test_client.post(
        f"/apps/{uuid.uuid4()}/threads/{uuid.uuid4()}/run",
        headers=headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_run_sync_webhook_not_configured_uses_simulator(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """POST /run with webhook mode but no URL silently uses simulator."""
    headers = authenticated_user["headers"]
    app_id, thread_id = await _create_app_and_thread(
        test_client,
        headers,
        app_config={
            "config_json": {"integration": {"mode": "webhook"}},
        },
    )
    await _send_user_message(test_client, headers, app_id, thread_id, "Hello")

    response = await test_client.post(
        f"/apps/{app_id}/threads/{thread_id}/run", headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["assistant_message"] is not None


# --- SSE /run/stream endpoint ---


@pytest.mark.asyncio
async def test_stream_simulator_mode(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """GET /run/stream with simulator mode returns SSE delta events."""
    headers = authenticated_user["headers"]
    app_id, thread_id = await _create_app_and_thread(test_client, headers)
    await _send_user_message(test_client, headers, app_id, thread_id, "Hello!")

    response = await test_client.get(
        f"/apps/{app_id}/threads/{thread_id}/run/stream",
        headers=headers,
    )
    assert response.status_code == 200
    assert "text/event-stream" in response.headers.get("content-type", "")

    # Parse SSE events
    text = response.text
    events = _parse_sse(text)

    # Should have meta, at least one delta, and a done event
    meta_events = [e for e in events if e["event"] == "meta"]
    delta_events = [e for e in events if e["event"] == "delta"]
    done_events = [e for e in events if e["event"] == "done"]
    assert len(meta_events) == 1
    assert len(delta_events) >= 1
    assert len(done_events) == 1


@pytest.mark.asyncio
async def test_stream_persists_assistant_message(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """GET /run/stream persists assistant message after streaming."""
    headers = authenticated_user["headers"]
    app_id, thread_id = await _create_app_and_thread(test_client, headers)
    await _send_user_message(test_client, headers, app_id, thread_id, "Test")

    await test_client.get(
        f"/apps/{app_id}/threads/{thread_id}/run/stream", headers=headers
    )

    # Verify message is persisted
    msgs_resp = await test_client.get(
        f"/apps/{app_id}/threads/{thread_id}/messages", headers=headers
    )
    messages = msgs_resp.json()
    assert len(messages) == 2
    assert messages[1]["role"] == "assistant"


def _parse_sse(text: str) -> list[dict]:
    """Parse SSE text into a list of {event, data} dicts."""
    events = []
    current_event = "message"
    current_data = []

    for line in text.split("\n"):
        if line.startswith("event:"):
            current_event = line[len("event:"):].strip()
        elif line.startswith("data:"):
            current_data.append(line[len("data:"):].strip())
        elif line == "" and current_data:
            events.append({"event": current_event, "data": "\n".join(current_data)})
            current_event = "message"
            current_data = []

    # Handle trailing event without final blank line
    if current_data:
        events.append({"event": current_event, "data": "\n".join(current_data)})

    return events
