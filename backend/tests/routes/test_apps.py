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
    async def test_get_single_app(self, test_client, db_session, authenticated_user):
        """Test getting a single app by ID."""
        app_data = {
            "name": "Single App",
            "description": "Get me",
            "user_id": authenticated_user["user"].id,
        }
        await db_session.execute(insert(App).values(**app_data))
        await db_session.commit()

        db_app = (
            await db_session.execute(select(App).where(App.name == "Single App"))
        ).scalar()

        response = await test_client.get(
            f"/apps/{db_app.id}", headers=authenticated_user["headers"]
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "Single App"
        assert data["description"] == "Get me"
        assert data["id"] == str(db_app.id)

    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_single_app_not_found(self, test_client, authenticated_user):
        """Test getting a non-existent app."""
        response = await test_client.get(
            "/apps/00000000-0000-0000-0000-000000000000",
            headers=authenticated_user["headers"],
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.asyncio(loop_scope="function")
    async def test_update_app(self, test_client, db_session, authenticated_user):
        """Test updating an app."""
        app_data = {
            "name": "Old Name",
            "description": "Old Description",
            "user_id": authenticated_user["user"].id,
        }
        await db_session.execute(insert(App).values(**app_data))
        await db_session.commit()

        db_app = (
            await db_session.execute(select(App).where(App.name == "Old Name"))
        ).scalar()

        response = await test_client.patch(
            f"/apps/{db_app.id}",
            json={"name": "New Name", "description": "New Description"},
            headers=authenticated_user["headers"],
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "New Name"
        assert data["description"] == "New Description"

    @pytest.mark.asyncio(loop_scope="function")
    async def test_update_app_partial(
        self, test_client, db_session, authenticated_user
    ):
        """Test partially updating an app (only name)."""
        app_data = {
            "name": "Partial Name",
            "description": "Keep This",
            "user_id": authenticated_user["user"].id,
        }
        await db_session.execute(insert(App).values(**app_data))
        await db_session.commit()

        db_app = (
            await db_session.execute(select(App).where(App.name == "Partial Name"))
        ).scalar()

        response = await test_client.patch(
            f"/apps/{db_app.id}",
            json={"name": "Changed Name"},
            headers=authenticated_user["headers"],
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "Changed Name"
        assert data["description"] == "Keep This"

    @pytest.mark.asyncio(loop_scope="function")
    async def test_update_app_not_found(self, test_client, authenticated_user):
        """Test updating a non-existent app."""
        response = await test_client.patch(
            "/apps/00000000-0000-0000-0000-000000000000",
            json={"name": "Nope"},
            headers=authenticated_user["headers"],
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

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

    @pytest.mark.asyncio(loop_scope="function")
    async def test_create_app_with_config(self, test_client, authenticated_user):
        """Test creating an app with webhook and integration config."""
        app_data = {
            "name": "Configured App",
            "description": "Has integration config",
            "webhook_url": "https://example.com/webhook",
            "config_json": {
                "integration": {"mode": "webhook"},
                "webhook": {"timeout_ms": 5000},
            },
        }
        response = await test_client.post(
            "/apps/", json=app_data, headers=authenticated_user["headers"]
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["webhook_url"] == "https://example.com/webhook"
        assert data["config_json"]["integration"]["mode"] == "webhook"
        assert data["config_json"]["webhook"]["timeout_ms"] == 5000

    @pytest.mark.asyncio(loop_scope="function")
    async def test_update_app_config(self, test_client, db_session, authenticated_user):
        """Test updating app integration config."""
        # Create app
        create_response = await test_client.post(
            "/apps/",
            json={"name": "Plain App"},
            headers=authenticated_user["headers"],
        )
        app_id = create_response.json()["id"]

        # Update with config
        update_response = await test_client.patch(
            f"/apps/{app_id}",
            json={
                "webhook_url": "https://hook.example.com/api",
                "config_json": {
                    "integration": {"mode": "webhook"},
                    "simulator": {"scenario": "ecommerce_support"},
                },
            },
            headers=authenticated_user["headers"],
        )
        assert update_response.status_code == status.HTTP_200_OK
        data = update_response.json()
        assert data["webhook_url"] == "https://hook.example.com/api"
        assert data["config_json"]["integration"]["mode"] == "webhook"

    @pytest.mark.asyncio(loop_scope="function")
    async def test_app_defaults_empty_config(self, test_client, authenticated_user):
        """Test that a new app defaults to empty config_json."""
        response = await test_client.post(
            "/apps/",
            json={"name": "Default App"},
            headers=authenticated_user["headers"],
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["config_json"] == {}
        assert data["webhook_url"] is None
