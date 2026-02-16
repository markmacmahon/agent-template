import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import App


@pytest.mark.asyncio
async def test_create_message(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """Test creating a message in a thread."""
    # Create app and thread
    app_response = await test_client.post(
        "/apps/",
        json={"name": "Test App"},
        headers=authenticated_user["headers"],
    )
    app_id = app_response.json()["id"]

    thread_response = await test_client.post(
        f"/apps/{app_id}/threads",
        json={"title": "Test Thread"},
        headers=authenticated_user["headers"],
    )
    thread_id = thread_response.json()["thread"]["id"]

    # Create a message
    message_data = {
        "content": "Hello, this is a test message",
        "content_json": {"metadata": "test"},
    }
    response = await test_client.post(
        f"/apps/{app_id}/threads/{thread_id}/messages",
        json=message_data,
        headers=authenticated_user["headers"],
    )

    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "user"
    assert data["content"] == "Hello, this is a test message"
    assert data["content_json"] == {"metadata": "test"}
    assert data["seq"] == 2  # First user message (seq 1 is initial greeting)
    assert data["thread_id"] == thread_id
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_message_seq_increments(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """Test that message seq increments correctly."""
    # Create app and thread
    app_response = await test_client.post(
        "/apps/",
        json={"name": "Test App"},
        headers=authenticated_user["headers"],
    )
    app_id = app_response.json()["id"]

    thread_response = await test_client.post(
        f"/apps/{app_id}/threads",
        json={"title": "Test Thread"},
        headers=authenticated_user["headers"],
    )
    thread_id = thread_response.json()["thread"]["id"]

    # Create multiple messages (seq 1 is initial greeting, so user messages start at 2)
    for i in range(5):
        expected_seq = i + 2
        response = await test_client.post(
            f"/apps/{app_id}/threads/{thread_id}/messages",
            json={"content": f"Message {expected_seq}"},
            headers=authenticated_user["headers"],
        )
        assert response.status_code == 200
        assert response.json()["seq"] == expected_seq


@pytest.mark.asyncio
async def test_list_messages(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """Test listing messages in a thread."""
    # Create app and thread
    app_response = await test_client.post(
        "/apps/",
        json={"name": "Test App"},
        headers=authenticated_user["headers"],
    )
    app_id = app_response.json()["id"]

    thread_response = await test_client.post(
        f"/apps/{app_id}/threads",
        json={"title": "Test Thread"},
        headers=authenticated_user["headers"],
    )
    thread_id = thread_response.json()["thread"]["id"]

    # Create messages
    for i in range(5):
        await test_client.post(
            f"/apps/{app_id}/threads/{thread_id}/messages",
            json={"content": f"Message {i + 1}"},
            headers=authenticated_user["headers"],
        )

    # List messages
    response = await test_client.get(
        f"/apps/{app_id}/threads/{thread_id}/messages",
        headers=authenticated_user["headers"],
    )

    assert response.status_code == 200
    messages = response.json()
    assert len(messages) == 6  # 1 initial greeting + 5 user messages
    assert messages[0]["role"] == "assistant"
    assert messages[0]["content"] == "Hello there! How can I help you today?"
    assert messages[0]["seq"] == 1
    for i in range(1, 6):
        assert messages[i]["seq"] == i + 1
        assert messages[i]["content"] == f"Message {i}"


@pytest.mark.asyncio
async def test_list_messages_with_cursor_pagination(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """Test cursor pagination with before_seq."""
    # Create app and thread
    app_response = await test_client.post(
        "/apps/",
        json={"name": "Test App"},
        headers=authenticated_user["headers"],
    )
    app_id = app_response.json()["id"]

    thread_response = await test_client.post(
        f"/apps/{app_id}/threads",
        json={"title": "Test Thread"},
        headers=authenticated_user["headers"],
    )
    thread_id = thread_response.json()["thread"]["id"]

    # Create 10 user messages (thread already has 1 greeting at seq 1)
    for i in range(10):
        await test_client.post(
            f"/apps/{app_id}/threads/{thread_id}/messages",
            json={"content": f"Message {i + 1}"},
            headers=authenticated_user["headers"],
        )

    # Get messages before seq 6 with limit 3
    # Seq < 6 ordered asc limit 3 => first three: seq 1 (greeting), 2, 3
    response = await test_client.get(
        f"/apps/{app_id}/threads/{thread_id}/messages?before_seq=6&limit=3",
        headers=authenticated_user["headers"],
    )

    assert response.status_code == 200
    messages = response.json()
    assert len(messages) == 3
    assert messages[0]["seq"] == 1
    assert messages[1]["seq"] == 2
    assert messages[2]["seq"] == 3


@pytest.mark.asyncio
async def test_get_message(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """Test getting a specific message."""
    # Create app, thread, and message
    app_response = await test_client.post(
        "/apps/",
        json={"name": "Test App"},
        headers=authenticated_user["headers"],
    )
    app_id = app_response.json()["id"]

    thread_response = await test_client.post(
        f"/apps/{app_id}/threads",
        json={"title": "Test Thread"},
        headers=authenticated_user["headers"],
    )
    thread_id = thread_response.json()["thread"]["id"]

    message_response = await test_client.post(
        f"/apps/{app_id}/threads/{thread_id}/messages",
        json={"content": "Test message"},
        headers=authenticated_user["headers"],
    )
    message_id = message_response.json()["id"]

    # Get message
    response = await test_client.get(
        f"/messages/{message_id}",
        headers=authenticated_user["headers"],
    )

    assert response.status_code == 200
    assert response.json()["id"] == message_id
    assert response.json()["content"] == "Test message"


@pytest.mark.asyncio
async def test_create_message_unauthorized_thread(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """Test that creating a message in someone else's thread fails."""
    # Would need a second user fixture for this, but conceptually:
    # - Create thread owned by different user
    # - Try to create message
    # - Should get 404

    # For now, test with non-existent thread and app IDs
    import uuid

    fake_app_id = str(uuid.uuid4())
    fake_thread_id = str(uuid.uuid4())

    response = await test_client.post(
        f"/apps/{fake_app_id}/threads/{fake_thread_id}/messages",
        json={"content": "Unauthorized message"},
        headers=authenticated_user["headers"],
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_message_always_user_role(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """Test that messages created via POST are always role='user'."""
    # Create app and thread
    app_response = await test_client.post(
        "/apps/",
        json={"name": "Test App"},
        headers=authenticated_user["headers"],
    )
    app_id = app_response.json()["id"]

    thread_response = await test_client.post(
        f"/apps/{app_id}/threads",
        json={"title": "Test Thread"},
        headers=authenticated_user["headers"],
    )
    thread_id = thread_response.json()["thread"]["id"]

    # Create a user message (role is implicit)
    response = await test_client.post(
        f"/apps/{app_id}/threads/{thread_id}/messages",
        json={"content": "Hello"},
        headers=authenticated_user["headers"],
    )
    assert response.status_code == 200
    assert response.json()["role"] == "user"
    assert response.json()["seq"] == 2  # seq 1 is initial greeting


@pytest.mark.asyncio
async def test_create_assistant_message_for_simulation(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """Test creating assistant messages for manual dashboard simulation."""
    # Create app and thread
    app_response = await test_client.post(
        "/apps/",
        json={"name": "Test App"},
        headers=authenticated_user["headers"],
    )
    app_id = app_response.json()["id"]

    thread_response = await test_client.post(
        f"/apps/{app_id}/threads",
        json={"title": "Test Thread"},
        headers=authenticated_user["headers"],
    )
    thread_id = thread_response.json()["thread"]["id"]

    # Customer sends message (seq 1 is initial greeting)
    user_msg = await test_client.post(
        f"/apps/{app_id}/threads/{thread_id}/messages",
        json={"content": "I need help!"},
        headers=authenticated_user["headers"],
    )
    assert user_msg.json()["seq"] == 2
    assert user_msg.json()["role"] == "user"

    # Owner replies as assistant
    assistant_msg = await test_client.post(
        f"/apps/{app_id}/threads/{thread_id}/messages/assistant",
        json={"content": "Sure, how can I help?"},
        headers=authenticated_user["headers"],
    )
    assert assistant_msg.status_code == 200
    assert assistant_msg.json()["seq"] == 3
    assert assistant_msg.json()["role"] == "assistant"
    assert assistant_msg.json()["content"] == "Sure, how can I help?"

    # Verify all three messages are in thread (greeting, user, assistant)
    messages = await test_client.get(
        f"/apps/{app_id}/threads/{thread_id}/messages",
        headers=authenticated_user["headers"],
    )
    assert len(messages.json()) == 3
    assert messages.json()[0]["role"] == "assistant"  # greeting
    assert messages.json()[1]["role"] == "user"
    assert messages.json()[2]["role"] == "assistant"


@pytest.mark.asyncio
async def test_create_assistant_message_with_app_secret_auth(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """POST .../messages/assistant with X-App-Id + X-App-Secret works without JWT."""
    app_response = await test_client.post(
        "/apps/",
        json={"name": "Partner App"},
        headers=authenticated_user["headers"],
    )
    assert app_response.status_code == 200
    app_id = app_response.json()["id"]

    thread_response = await test_client.post(
        f"/apps/{app_id}/threads",
        json={"title": "Thread"},
        headers=authenticated_user["headers"],
    )
    thread_id = thread_response.json()["thread"]["id"]

    await db_session.execute(
        update(App)
        .where(App.id == uuid.UUID(app_id))
        .values(webhook_secret="msg-secret-123")
    )
    await db_session.commit()

    response = await test_client.post(
        f"/apps/{app_id}/threads/{thread_id}/messages/assistant",
        json={"content": "Partner reply"},
        headers={
            settings.WEBHOOK_HEADER_APP_ID: app_id,
            settings.WEBHOOK_HEADER_APP_SECRET: "msg-secret-123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "assistant"
    assert data["content"] == "Partner reply"


@pytest.mark.asyncio
async def test_create_message_updates_subscriber_activity(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """Sending a user message should update subscriber activity timestamps."""
    from app.models import Subscriber
    from sqlalchemy.future import select

    # Create app
    app_response = await test_client.post(
        "/apps/",
        json={"name": "Test App"},
        headers=authenticated_user["headers"],
    )
    app_id = app_response.json()["id"]

    # Create thread with customer_id (creates subscriber)
    thread_response = await test_client.post(
        f"/apps/{app_id}/threads",
        json={"title": "Test Thread", "customer_id": "user-xyz"},
        headers=authenticated_user["headers"],
    )
    thread_id = thread_response.json()["thread"]["id"]
    subscriber_id = thread_response.json()["thread"]["subscriber_id"]
    assert subscriber_id is not None

    # Check subscriber before message
    result = await db_session.execute(
        select(Subscriber).filter(Subscriber.id == subscriber_id)
    )
    subscriber = result.scalars().first()
    assert subscriber.last_message_at is None
    assert subscriber.last_seen_at is not None
    before_seen = subscriber.last_seen_at

    # Send a user message
    await test_client.post(
        f"/apps/{app_id}/threads/{thread_id}/messages",
        json={"content": "Hello!"},
        headers=authenticated_user["headers"],
    )

    # Refresh and check last_message_at is now set
    db_session.expire_all()
    result = await db_session.execute(
        select(Subscriber).filter(Subscriber.id == subscriber_id)
    )
    subscriber = result.scalars().first()
    assert subscriber.last_message_at is not None
    assert subscriber.last_seen_at is not None
    assert subscriber.last_seen_at >= before_seen


@pytest.mark.asyncio
async def test_create_message_assigns_subscriber_if_missing(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """Posting to a legacy thread without subscriber_id creates/subscribes subscriber."""
    from sqlalchemy.future import select
    from app.models import Thread, Subscriber

    # Create app + thread without subscriber_id via manual insert
    app_response = await test_client.post(
        "/apps/",
        json={"name": "Legacy App"},
        headers=authenticated_user["headers"],
    )
    app_id = app_response.json()["id"]

    thread_response = await test_client.post(
        f"/apps/{app_id}/threads",
        json={"title": "Legacy Thread", "customer_id": "legacy-1"},
        headers=authenticated_user["headers"],
    )
    thread_id = thread_response.json()["thread"]["id"]

    # Simulate legacy row by clearing subscriber_id manually
    await db_session.execute(
        Thread.__table__.update()
        .where(Thread.id == thread_id)
        .values(subscriber_id=None)
    )
    await db_session.commit()

    # Send message which should backfill subscriber
    await test_client.post(
        f"/apps/{app_id}/threads/{thread_id}/messages",
        json={"content": "Hello"},
        headers=authenticated_user["headers"],
    )

    db_session.expire_all()
    result = await db_session.execute(select(Thread).filter(Thread.id == thread_id))
    thread = result.scalars().first()
    assert thread.subscriber_id is not None

    sub_result = await db_session.execute(
        select(Subscriber).filter(Subscriber.id == thread.subscriber_id)
    )
    subscriber = sub_result.scalars().first()
    assert subscriber.customer_id == "legacy-1"
    assert subscriber.last_message_at is not None
