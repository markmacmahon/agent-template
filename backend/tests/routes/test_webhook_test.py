"""Tests for POST /apps/{app_id}/webhook/test endpoint."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


async def _create_app(test_client: AsyncClient, headers: dict) -> str:
    resp = await test_client.post(
        "/apps/",
        json={"name": "Webhook Test App", "description": "For testing webhooks"},
        headers=headers,
    )
    assert resp.status_code == 200
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_webhook_test_rejects_invalid_url(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """Test endpoint rejects localhost/private URLs."""
    headers = authenticated_user["headers"]
    app_id = await _create_app(test_client, headers)

    response = await test_client.post(
        f"/apps/{app_id}/webhook/test",
        json={"webhook_url": "http://localhost/hook"},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is False
    assert "blocked" in data["error"]


@pytest.mark.asyncio
async def test_webhook_test_rejects_ftp_scheme(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """Test endpoint rejects non-http schemes."""
    headers = authenticated_user["headers"]
    app_id = await _create_app(test_client, headers)

    response = await test_client.post(
        f"/apps/{app_id}/webhook/test",
        json={"webhook_url": "ftp://example.com/file"},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is False
    assert "scheme" in data["error"]


@pytest.mark.asyncio
async def test_webhook_test_success(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """Test endpoint reports success when webhook responds correctly."""
    headers = authenticated_user["headers"]
    app_id = await _create_app(test_client, headers)

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"reply": "Hello from webhook"}
    mock_response.text = '{"reply": "Hello from webhook"}'

    with patch("app.routes.webhook_test.httpx.AsyncClient") as mock_cls:
        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_cls.return_value = mock_client

        response = await test_client.post(
            f"/apps/{app_id}/webhook/test",
            json={"webhook_url": "https://example.com/hook", "sample_message": "Hi"},
            headers=headers,
        )

    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert data["status_code"] == 200
    assert data["response_json"]["reply"] == "Hello from webhook"


@pytest.mark.asyncio
async def test_webhook_test_missing_reply_field(
    test_client: AsyncClient, authenticated_user, db_session: AsyncSession
):
    """Test endpoint reports failure when response lacks 'reply' field."""
    headers = authenticated_user["headers"]
    app_id = await _create_app(test_client, headers)

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"text": "no reply field"}
    mock_response.text = '{"text": "no reply field"}'

    with patch("app.routes.webhook_test.httpx.AsyncClient") as mock_cls:
        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_cls.return_value = mock_client

        response = await test_client.post(
            f"/apps/{app_id}/webhook/test",
            json={"webhook_url": "https://example.com/hook"},
            headers=headers,
        )

    data = response.json()
    assert data["ok"] is False
    assert "reply" in data["error"]


@pytest.mark.asyncio
async def test_webhook_test_requires_auth(test_client: AsyncClient):
    """Test endpoint requires authentication."""
    response = await test_client.post(
        "/apps/00000000-0000-0000-0000-000000000000/webhook/test",
        json={"webhook_url": "https://example.com/hook"},
    )
    assert response.status_code == 401
