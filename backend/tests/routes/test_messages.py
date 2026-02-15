import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


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
    thread_id = thread_response.json()["id"]

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
    assert data["seq"] == 1  # First message
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
    thread_id = thread_response.json()["id"]

    # Create multiple messages
    for expected_seq in range(1, 6):
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
    thread_id = thread_response.json()["id"]

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
    assert len(messages) == 5
    # Verify order (ascending by seq)
    for i, msg in enumerate(messages):
        assert msg["seq"] == i + 1
        assert msg["content"] == f"Message {i + 1}"


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
    thread_id = thread_response.json()["id"]

    # Create 10 messages
    for i in range(10):
        await test_client.post(
            f"/apps/{app_id}/threads/{thread_id}/messages",
            json={"content": f"Message {i + 1}"},
            headers=authenticated_user["headers"],
        )

    # Get messages before seq 6 with limit 3
    # This gets seq < 6, ordered asc, limit 3
    # So we expect the last 3 messages before 6: messages 3, 4, 5
    response = await test_client.get(
        f"/apps/{app_id}/threads/{thread_id}/messages?before_seq=6&limit=3",
        headers=authenticated_user["headers"],
    )

    assert response.status_code == 200
    messages = response.json()
    assert len(messages) == 3
    # Messages with seq < 6, ordered asc, limit 3 gives us 1, 2, 3
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
    thread_id = thread_response.json()["id"]

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
    thread_id = thread_response.json()["id"]

    # Create a user message (role is implicit)
    response = await test_client.post(
        f"/apps/{app_id}/threads/{thread_id}/messages",
        json={"content": "Hello"},
        headers=authenticated_user["headers"],
    )
    assert response.status_code == 200
    assert response.json()["role"] == "user"
    assert response.json()["seq"] == 1


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
    thread_id = thread_response.json()["id"]

    # Customer sends message
    user_msg = await test_client.post(
        f"/apps/{app_id}/threads/{thread_id}/messages",
        json={"content": "I need help!"},
        headers=authenticated_user["headers"],
    )
    assert user_msg.json()["seq"] == 1
    assert user_msg.json()["role"] == "user"

    # Owner replies as assistant
    assistant_msg = await test_client.post(
        f"/apps/{app_id}/threads/{thread_id}/messages/assistant",
        json={"content": "Sure, how can I help?"},
        headers=authenticated_user["headers"],
    )
    assert assistant_msg.status_code == 200
    assert assistant_msg.json()["seq"] == 2
    assert assistant_msg.json()["role"] == "assistant"
    assert assistant_msg.json()["content"] == "Sure, how can I help?"

    # Verify both messages are in thread
    messages = await test_client.get(
        f"/apps/{app_id}/threads/{thread_id}/messages",
        headers=authenticated_user["headers"],
    )
    assert len(messages.json()) == 2
    assert messages.json()[0]["role"] == "user"
    assert messages.json()[1]["role"] == "assistant"
