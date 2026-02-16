"""Tests for subscriber endpoints."""

from __future__ import annotations

import base64
import json
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import insert, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Subscriber, App, Thread, Message


def encode_cursor(payload: dict) -> str:
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()


class TestSubscribers:
    @pytest.mark.asyncio(loop_scope="function")
    async def test_list_subscribers_empty(
        self, test_client, db_session, authenticated_user
    ):
        """Listing subscribers returns empty cursor payload when none exist."""
        app = await self._create_app(db_session, authenticated_user["user"].id)

        response = await test_client.get(
            f"/apps/{app.id}/subscribers",
            headers=authenticated_user["headers"],
        )

        assert response.status_code == 200
        data = response.json()
        assert data == {"items": [], "next_cursor": None}

    @pytest.mark.asyncio(loop_scope="function")
    async def test_list_subscribers_cursor_pagination(
        self, test_client, db_session, authenticated_user
    ):
        """Cursor pagination returns slices ordered by most recent activity."""
        app = await self._create_app(db_session, authenticated_user["user"].id)

        base_time = datetime.now(timezone.utc)
        subscribers: list[Subscriber] = []
        for idx in range(5):
            sub = Subscriber(
                app_id=app.id,
                customer_id=f"cust-{idx}",
                display_name=f"Customer {idx}",
                created_at=base_time - timedelta(minutes=idx),
                last_message_at=base_time - timedelta(minutes=idx),
            )
            subscribers.append(sub)
            db_session.add(sub)
        await db_session.commit()

        response = await test_client.get(
            f"/apps/{app.id}/subscribers?limit=2",
            headers=authenticated_user["headers"],
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2
        assert data["next_cursor"] is not None

        next_cursor = data["next_cursor"]
        second_page = await test_client.get(
            f"/apps/{app.id}/subscribers?limit=2&cursor={next_cursor}",
            headers=authenticated_user["headers"],
        )
        assert second_page.status_code == 200
        second_data = second_page.json()
        assert len(second_data["items"]) == 2
        assert second_data["next_cursor"] is not None

        third_page = await test_client.get(
            f"/apps/{app.id}/subscribers?limit=2&cursor={second_data['next_cursor']}",
            headers=authenticated_user["headers"],
        )
        assert third_page.status_code == 200
        third_data = third_page.json()
        assert len(third_data["items"]) == 1
        assert third_data["next_cursor"] is None

    @pytest.mark.asyncio(loop_scope="function")
    async def test_list_subscribers_search(
        self, test_client, db_session, authenticated_user
    ):
        """Search filters by both customer_id and display_name."""
        app = await self._create_app(db_session, authenticated_user["user"].id)
        other_app = await self._create_app(db_session, authenticated_user["user"].id)

        for cid, display in (
            ("alpha-1", "Alpha"),
            ("beta-1", "Beta"),
            ("other", "Other"),
        ):
            db_session.add(
                Subscriber(
                    app_id=app.id,
                    customer_id=cid,
                    display_name=display,
                    created_at=datetime.now(timezone.utc),
                )
            )
        # noise in another app
        db_session.add(
            Subscriber(
                app_id=other_app.id,
                customer_id="alpha-foreign",
                display_name="Alpha Foreign",
                created_at=datetime.now(timezone.utc),
            )
        )
        await db_session.commit()

        response = await test_client.get(
            f"/apps/{app.id}/subscribers?q=alpha",
            headers=authenticated_user["headers"],
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["customer_id"] == "alpha-1"

    @pytest.mark.asyncio(loop_scope="function")
    async def test_list_subscribers_unauthorized(self, test_client):
        """Listing subscribers without auth fails before hitting DB."""
        fake_app_id = "00000000-0000-0000-0000-000000000000"
        response = await test_client.get(f"/apps/{fake_app_id}/subscribers")
        assert response.status_code == 401

    @pytest.mark.asyncio(loop_scope="function")
    async def test_list_subscribers_wrong_app(self, test_client, authenticated_user):
        """Listing subscribers for a non-existent app returns 404."""
        fake_app_id = "00000000-0000-0000-0000-000000000000"
        response = await test_client.get(
            f"/apps/{fake_app_id}/subscribers",
            headers=authenticated_user["headers"],
        )
        assert response.status_code == 404

    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_subscriber_threads_empty(
        self, test_client, db_session, authenticated_user
    ):
        """Subscriber threads endpoint returns cursor payload and enforces ownership."""
        app = await self._create_app(db_session, authenticated_user["user"].id)
        subscriber = Subscriber(
            app_id=app.id,
            customer_id="test-customer-1",
            display_name="Test Customer",
            created_at=datetime.now(timezone.utc),
        )
        db_session.add(subscriber)
        await db_session.commit()

        response = await test_client.get(
            f"/apps/{app.id}/subscribers/{subscriber.id}/threads",
            headers=authenticated_user["headers"],
        )

        assert response.status_code == 200
        data = response.json()
        assert data == {"items": [], "next_cursor": None}

    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_subscriber_threads_cursor(
        self, test_client, db_session, authenticated_user
    ):
        """Threads for a subscriber are ordered by updated_at DESC using cursor pagination."""
        app = await self._create_app(db_session, authenticated_user["user"].id)
        subscriber = Subscriber(
            app_id=app.id,
            customer_id="cursor-subscriber",
            created_at=datetime.now(timezone.utc),
        )
        db_session.add(subscriber)
        await db_session.commit()
        await db_session.refresh(subscriber)

        threads = []
        now = datetime.now(timezone.utc)
        for idx in range(4):
            thread = Thread(
                app_id=app.id,
                subscriber_id=subscriber.id,
                customer_id=subscriber.customer_id,
                title=f"Thread {idx}",
                next_seq=idx + 2,
                created_at=now - timedelta(hours=idx + 1),
                updated_at=now - timedelta(hours=idx + 1),
            )
            threads.append(thread)
            db_session.add(thread)
        await db_session.commit()

        # attach a message to ensure message_count is surfaced
        db_session.add(
            Message(
                thread_id=threads[0].id,
                seq=1,
                role="assistant",
                content="hello",
                created_at=now,
            )
        )
        await db_session.commit()

        first = await test_client.get(
            f"/apps/{app.id}/subscribers/{subscriber.id}/threads?limit=2",
            headers=authenticated_user["headers"],
        )
        assert first.status_code == 200
        first_payload = first.json()
        assert len(first_payload["items"]) == 2
        assert first_payload["items"][0]["message_count"] == 1
        assert first_payload["next_cursor"]

        second = await test_client.get(
            f"/apps/{app.id}/subscribers/{subscriber.id}/threads?limit=2&cursor={first_payload['next_cursor']}",
            headers=authenticated_user["headers"],
        )
        assert second.status_code == 200
        assert len(second.json()["items"]) == 2
        assert second.json()["next_cursor"] is None

    @pytest.mark.asyncio(loop_scope="function")
    async def test_get_subscriber_detail(
        self, test_client, db_session, authenticated_user
    ):
        """Fetching subscriber detail still works with cursor pagination elsewhere."""
        app = await self._create_app(db_session, authenticated_user["user"].id)
        subscriber = Subscriber(
            app_id=app.id,
            customer_id="test-customer-2",
            display_name="Test Customer 2",
            created_at=datetime.now(timezone.utc),
        )
        db_session.add(subscriber)
        await db_session.commit()
        await db_session.refresh(subscriber)

        response = await test_client.get(
            f"/apps/{app.id}/subscribers/{subscriber.id}",
            headers=authenticated_user["headers"],
        )

        assert response.status_code == 200
        data = response.json()
        assert data["customer_id"] == "test-customer-2"
        assert data["display_name"] == "Test Customer 2"

    @pytest.mark.asyncio(loop_scope="function")
    async def test_list_subscribers_with_app_secret_auth(
        self, test_client, db_session, authenticated_user
    ):
        """Listing subscribers with X-App-Id + X-App-Secret works without JWT."""
        app = await self._create_app(db_session, authenticated_user["user"].id)
        await db_session.execute(
            update(App)
            .where(App.id == app.id)
            .values(webhook_secret="partner-secret-abc")
        )
        await db_session.commit()

        response = await test_client.get(
            f"/apps/{app.id}/subscribers",
            headers={
                settings.WEBHOOK_HEADER_APP_ID: str(app.id),
                settings.WEBHOOK_HEADER_APP_SECRET: "partner-secret-abc",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert data["next_cursor"] is None

    @pytest.mark.asyncio(loop_scope="function")
    async def test_list_subscribers_app_secret_invalid_returns_401(
        self, test_client, db_session, authenticated_user
    ):
        """Wrong X-App-Secret returns 401."""
        app = await self._create_app(db_session, authenticated_user["user"].id)
        await db_session.execute(
            update(App).where(App.id == app.id).values(webhook_secret="correct-secret")
        )
        await db_session.commit()

        response = await test_client.get(
            f"/apps/{app.id}/subscribers",
            headers={
                settings.WEBHOOK_HEADER_APP_ID: str(app.id),
                settings.WEBHOOK_HEADER_APP_SECRET: "wrong-secret",
            },
        )
        assert response.status_code == 401
        assert (
            response.json().get("detail") == "ERROR_PARTNER_API_APP_OR_SECRET_INVALID"
        )

    @staticmethod
    async def _create_app(db_session: AsyncSession, user_id):
        result = await db_session.execute(
            insert(App).values(name="Test App", user_id=user_id).returning(App)
        )
        app = result.scalar()
        await db_session.commit()
        return app
