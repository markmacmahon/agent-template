import pytest
from fastapi import status
from sqlalchemy import select, insert
from app.models import App


class TestApps:
    @pytest.mark.asyncio(loop_scope="function")
    async def test_create_app(self, test_client, db_session, authenticated_user):
        """Test creating an app."""
        app_data = {"name": "Test App", "description": "Test Description"}
        create_response = await test_client.post(
            "/apps/", json=app_data, headers=authenticated_user["headers"]
        )

        assert create_response.status_code == status.HTTP_200_OK
        created_app = create_response.json()
        assert created_app["name"] == app_data["name"]
        assert created_app["description"] == app_data["description"]

        # Check if the app is in the database
        app = await db_session.execute(select(App).where(App.id == created_app["id"]))
        app = app.scalar()

        assert app is not None
        assert app.name == app_data["name"]
        assert app.description == app_data["description"]

    @pytest.mark.asyncio(loop_scope="function")
    async def test_read_apps(self, test_client, db_session, authenticated_user):
        """Test reading apps."""
        # Create multiple apps
        apps_data = [
            {
                "name": "First App",
                "description": "First Description",
                "user_id": authenticated_user["user"].id,
            },
            {
                "name": "Second App",
                "description": "Second Description",
                "user_id": authenticated_user["user"].id,
            },
        ]
        # create apps in the database
        for app_data in apps_data:
            await db_session.execute(insert(App).values(**app_data))

        await db_session.commit()  # Add commit to ensure apps are saved

        # Read apps - test pagination response
        read_response = await test_client.get(
            "/apps/", headers=authenticated_user["headers"]
        )
        assert read_response.status_code == status.HTTP_200_OK
        response_data = read_response.json()

        # Check pagination structure
        assert "items" in response_data
        assert "total" in response_data
        assert "page" in response_data
        assert "size" in response_data

        apps = response_data["items"]

        # Filter apps created in this test (to avoid interference from other tests)
        test_apps = [app for app in apps if app["name"] in ["First App", "Second App"]]

        assert len(test_apps) == 2
        assert any(app["name"] == "First App" for app in test_apps)
        assert any(app["name"] == "Second App" for app in test_apps)

    @pytest.mark.asyncio(loop_scope="function")
    async def test_delete_app(self, test_client, db_session, authenticated_user):
        """Test deleting an app."""
        # Create an app directly in the database
        app_data = {
            "name": "App to Delete",
            "description": "Will be deleted",
            "user_id": authenticated_user["user"].id,
        }
        await db_session.execute(insert(App).values(**app_data))

        # Get the created app from database
        db_app = (
            await db_session.execute(select(App).where(App.name == app_data["name"]))
        ).scalar()

        # Delete the app
        delete_response = await test_client.delete(
            f"/apps/{db_app.id}", headers=authenticated_user["headers"]
        )
        assert delete_response.status_code == status.HTTP_200_OK

        # Verify app is deleted from database
        db_check = (
            await db_session.execute(select(App).where(App.id == db_app.id))
        ).scalar()
        assert db_check is None

    @pytest.mark.asyncio(loop_scope="function")
    async def test_delete_nonexistent_app(self, test_client, authenticated_user):
        """Test deleting an app that doesn't exist."""
        # Try to delete non-existent app
        delete_response = await test_client.delete(
            "/apps/00000000-0000-0000-0000-000000000000",
            headers=authenticated_user["headers"],
        )
        assert delete_response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio(loop_scope="function")
    async def test_unauthorized_read_apps(self, test_client):
        """Test reading apps without authentication."""
        response = await test_client.get("/apps/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio(loop_scope="function")
    async def test_unauthorized_create_app(self, test_client):
        """Test creating app without authentication."""
        app_data = {"name": "Unauthorized App", "description": "Should fail"}
        response = await test_client.post("/apps/", json=app_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio(loop_scope="function")
    async def test_unauthorized_delete_app(self, test_client):
        """Test deleting app without authentication."""
        response = await test_client.delete(
            "/apps/00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
