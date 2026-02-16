import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import App


@pytest.mark.asyncio
async def test_create_thread(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """Test creating a thread for an app."""
    # Create an app first
    app_response = await test_client.post(
        "/apps/",
        json={"name": "Test App", "description": "A test app"},
        headers=authenticated_user["headers"],
    )
    assert app_response.status_code == 200
    app_id = app_response.json()["id"]

    # Create a thread
    thread_data = {
        "title": "Test Thread",
        "customer_id": "user123",
    }
    response = await test_client.post(
        f"/apps/{app_id}/threads",
        json=thread_data,
        headers=authenticated_user["headers"],
    )

    assert response.status_code == 200
    data = response.json()
    thread = data["thread"]
    initial_message = data["initial_message"]

    assert thread["title"] == "Test Thread"
    assert thread["customer_id"] == "user123"
    assert thread["status"] == "active"
    assert thread["app_id"] == app_id
    assert "id" in thread
    assert "created_at" in thread
    assert "updated_at" in thread

    # Greeting returned instantly so UI can show it without a second request
    assert initial_message["role"] == "assistant"
    assert initial_message["content"] == "Hello there! How can I help you today?"
    assert initial_message["thread_id"] == thread["id"]

    # Greeting is persisted as first message
    thread_id = thread["id"]
    messages_response = await test_client.get(
        f"/apps/{app_id}/threads/{thread_id}/messages",
        headers=authenticated_user["headers"],
    )
    assert messages_response.status_code == 200
    messages = messages_response.json()
    assert len(messages) == 1
    assert messages[0]["content"] == initial_message["content"]


@pytest.mark.asyncio
async def test_create_thread_unauthorized_app(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """Test that creating a thread for someone else's app fails."""
    import uuid

    # Create a second user
    from app.models import User
    from fastapi_users.password import PasswordHelper

    other_user = User(
        id=uuid.uuid4(),
        email="other@example.com",
        hashed_password=PasswordHelper().hash("OtherPassword123#"),
        is_active=True,
        is_superuser=False,
        is_verified=True,
    )
    db_session.add(other_user)
    await db_session.commit()

    # Create an app owned by the other user
    other_app = App(
        name="Other User's App",
        description="Not owned by test user",
        user_id=other_user.id,
    )
    db_session.add(other_app)
    await db_session.commit()
    await db_session.refresh(other_app)

    # Try to create a thread for the other user's app
    response = await test_client.post(
        f"/apps/{other_app.id}/threads",
        json={"title": "Unauthorized Thread"},
        headers=authenticated_user["headers"],
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "ERROR_APP_NOT_FOUND"


@pytest.mark.asyncio
async def test_list_threads_with_app_secret_auth(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """List threads with X-App-Id + X-App-Secret works without JWT."""
    app_response = await test_client.post(
        "/apps/",
        json={"name": "Partner App"},
        headers=authenticated_user["headers"],
    )
    assert app_response.status_code == 200
    app_id = app_response.json()["id"]

    await db_session.execute(
        update(App)
        .where(App.id == uuid.UUID(app_id))
        .values(webhook_secret="thread-secret-xyz")
    )
    await db_session.commit()

    response = await test_client.get(
        f"/apps/{app_id}/threads",
        headers={
            settings.WEBHOOK_HEADER_APP_ID: app_id,
            settings.WEBHOOK_HEADER_APP_SECRET: "thread-secret-xyz",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "next_cursor" in data


@pytest.mark.asyncio
async def test_list_threads(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """App threads endpoint returns cursor payload ordered by updated_at."""
    # Create app
    app_response = await test_client.post(
        "/apps/",
        json={"name": "Test App"},
        headers=authenticated_user["headers"],
    )
    app_id = app_response.json()["id"]

    # Create multiple threads
    for i in range(4):
        await test_client.post(
            f"/apps/{app_id}/threads",
            json={"title": f"Thread {i}", "customer_id": f"user{i}"},
            headers=authenticated_user["headers"],
        )

    # List threads first page
    response = await test_client.get(
        f"/apps/{app_id}/threads?limit=2",
        headers=authenticated_user["headers"],
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    assert data["next_cursor"] is not None

    # Second page
    response2 = await test_client.get(
        f"/apps/{app_id}/threads?limit=2&cursor={data['next_cursor']}",
        headers=authenticated_user["headers"],
    )
    assert response2.status_code == 200
    data2 = response2.json()
    assert len(data2["items"]) == 2
    assert data2["next_cursor"] is None


@pytest.mark.asyncio
async def test_list_threads_filter_by_customer(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """Test filtering threads by customer_id."""
    # Create app
    app_response = await test_client.post(
        "/apps/",
        json={"name": "Test App"},
        headers=authenticated_user["headers"],
    )
    app_id = app_response.json()["id"]

    # Create threads with different customers
    await test_client.post(
        f"/apps/{app_id}/threads",
        json={"title": "Thread 1", "customer_id": "alice"},
        headers=authenticated_user["headers"],
    )
    await test_client.post(
        f"/apps/{app_id}/threads",
        json={"title": "Thread 2", "customer_id": "bob"},
        headers=authenticated_user["headers"],
    )
    await test_client.post(
        f"/apps/{app_id}/threads",
        json={"title": "Thread 3", "customer_id": "alice"},
        headers=authenticated_user["headers"],
    )

    # Filter by alice
    response = await test_client.get(
        f"/apps/{app_id}/threads?customer_id=alice",
        headers=authenticated_user["headers"],
    )

    assert response.status_code == 200
    data = response.json()
    assert data["next_cursor"] is None
    assert all(item["customer_id"] == "alice" for item in data["items"])


@pytest.mark.asyncio
async def test_get_thread(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """Test getting a specific thread."""
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

    # Get thread
    response = await test_client.get(
        f"/threads/{thread_id}",
        headers=authenticated_user["headers"],
    )

    assert response.status_code == 200
    assert response.json()["id"] == thread_id
    assert response.json()["title"] == "Test Thread"


@pytest.mark.asyncio
async def test_update_thread(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """Test updating a thread."""
    # Create app and thread
    app_response = await test_client.post(
        "/apps/",
        json={"name": "Test App"},
        headers=authenticated_user["headers"],
    )
    app_id = app_response.json()["id"]

    thread_response = await test_client.post(
        f"/apps/{app_id}/threads",
        json={"title": "Original Title"},
        headers=authenticated_user["headers"],
    )
    thread_id = thread_response.json()["thread"]["id"]

    # Update thread
    response = await test_client.patch(
        f"/threads/{thread_id}",
        json={"title": "Updated Title", "status": "archived"},
        headers=authenticated_user["headers"],
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Updated Title"
    assert response.json()["status"] == "archived"


@pytest.mark.asyncio
async def test_delete_thread(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """Test deleting a thread."""
    # Create app and thread
    app_response = await test_client.post(
        "/apps/",
        json={"name": "Test App"},
        headers=authenticated_user["headers"],
    )
    app_id = app_response.json()["id"]

    thread_response = await test_client.post(
        f"/apps/{app_id}/threads",
        json={"title": "Thread to Delete"},
        headers=authenticated_user["headers"],
    )
    thread_id = thread_response.json()["thread"]["id"]

    # Delete thread
    response = await test_client.delete(
        f"/threads/{thread_id}",
        headers=authenticated_user["headers"],
    )

    assert response.status_code == 200

    # Verify deletion
    get_response = await test_client.get(
        f"/threads/{thread_id}",
        headers=authenticated_user["headers"],
    )
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_create_thread_creates_subscriber(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """Creating a thread with customer_id should auto-create a Subscriber."""
    from app.models import Subscriber
    from sqlalchemy.future import select

    # Create app
    app_response = await test_client.post(
        "/apps/",
        json={"name": "Test App"},
        headers=authenticated_user["headers"],
    )
    app_id = app_response.json()["id"]

    # Create thread with customer_id
    response = await test_client.post(
        f"/apps/{app_id}/threads",
        json={"title": "Thread 1", "customer_id": "user-abc"},
        headers=authenticated_user["headers"],
    )
    assert response.status_code == 200
    thread = response.json()["thread"]
    assert thread["subscriber_id"] is not None

    # Verify subscriber exists in DB
    result = await db_session.execute(
        select(Subscriber).filter(
            Subscriber.app_id == app_id, Subscriber.customer_id == "user-abc"
        )
    )
    subscriber = result.scalars().first()
    assert subscriber is not None
    assert str(subscriber.id) == thread["subscriber_id"]
    assert subscriber.display_name == "user-abc"
    assert subscriber.last_seen_at is not None


@pytest.mark.asyncio
async def test_create_thread_reuses_existing_subscriber(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """Creating two threads with the same customer_id should reuse the subscriber."""
    # Create app
    app_response = await test_client.post(
        "/apps/",
        json={"name": "Test App"},
        headers=authenticated_user["headers"],
    )
    app_id = app_response.json()["id"]

    # Create two threads with the same customer_id
    resp1 = await test_client.post(
        f"/apps/{app_id}/threads",
        json={"title": "Thread 1", "customer_id": "same-user"},
        headers=authenticated_user["headers"],
    )
    resp2 = await test_client.post(
        f"/apps/{app_id}/threads",
        json={"title": "Thread 2", "customer_id": "same-user"},
        headers=authenticated_user["headers"],
    )

    assert resp1.status_code == 200
    assert resp2.status_code == 200

    thread1 = resp1.json()["thread"]
    thread2 = resp2.json()["thread"]

    # Both threads should point to the same subscriber
    assert thread1["subscriber_id"] == thread2["subscriber_id"]


@pytest.mark.asyncio
async def test_delete_thread_removes_orphaned_subscriber(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """Deleting the last thread for a subscriber should delete the subscriber."""
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
        json={"title": "Only Thread", "customer_id": "orphan-user"},
        headers=authenticated_user["headers"],
    )
    assert thread_response.status_code == 200
    thread = thread_response.json()["thread"]
    subscriber_id = thread["subscriber_id"]
    assert subscriber_id is not None

    # Delete the thread
    delete_response = await test_client.delete(
        f"/threads/{thread['id']}",
        headers=authenticated_user["headers"],
    )
    assert delete_response.status_code == 200

    # Subscriber should be gone
    result = await db_session.execute(
        select(Subscriber).filter(Subscriber.id == subscriber_id)
    )
    assert result.scalars().first() is None


@pytest.mark.asyncio
async def test_delete_thread_keeps_subscriber_with_remaining_threads(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """Deleting one thread should keep the subscriber if other threads remain."""
    from app.models import Subscriber
    from sqlalchemy.future import select

    # Create app
    app_response = await test_client.post(
        "/apps/",
        json={"name": "Test App"},
        headers=authenticated_user["headers"],
    )
    app_id = app_response.json()["id"]

    # Create two threads with same customer_id
    resp1 = await test_client.post(
        f"/apps/{app_id}/threads",
        json={"title": "Thread 1", "customer_id": "shared-user"},
        headers=authenticated_user["headers"],
    )
    resp2 = await test_client.post(
        f"/apps/{app_id}/threads",
        json={"title": "Thread 2", "customer_id": "shared-user"},
        headers=authenticated_user["headers"],
    )
    assert resp1.status_code == 200
    assert resp2.status_code == 200

    thread1 = resp1.json()["thread"]
    subscriber_id = thread1["subscriber_id"]

    # Delete one thread
    delete_response = await test_client.delete(
        f"/threads/{thread1['id']}",
        headers=authenticated_user["headers"],
    )
    assert delete_response.status_code == 200

    # Subscriber should still exist
    result = await db_session.execute(
        select(Subscriber).filter(Subscriber.id == subscriber_id)
    )
    assert result.scalars().first() is not None
