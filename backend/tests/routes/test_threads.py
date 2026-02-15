import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

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
    assert data["title"] == "Test Thread"
    assert data["customer_id"] == "user123"
    assert data["status"] == "active"
    assert data["app_id"] == app_id
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


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
    assert "not found or not authorized" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_list_threads(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """Test listing threads for an app."""
    # Create app
    app_response = await test_client.post(
        "/apps/",
        json={"name": "Test App"},
        headers=authenticated_user["headers"],
    )
    app_id = app_response.json()["id"]

    # Create multiple threads
    thread_ids = []
    for i in range(3):
        response = await test_client.post(
            f"/apps/{app_id}/threads",
            json={"title": f"Thread {i}", "customer_id": f"user{i}"},
            headers=authenticated_user["headers"],
        )
        thread_ids.append(response.json()["id"])

    # List threads
    response = await test_client.get(
        f"/apps/{app_id}/threads",
        headers=authenticated_user["headers"],
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert len(data["items"]) == 3


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
    assert data["total"] == 2
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
    thread_id = thread_response.json()["id"]

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
    thread_id = thread_response.json()["id"]

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
    thread_id = thread_response.json()["id"]

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
