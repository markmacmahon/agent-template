"""Tests for global error handling."""

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_404_returns_json(test_client):
    """Non-existent routes must return JSON, not HTML."""
    response = await test_client.get("/this-route-does-not-exist")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    data = response.json()
    assert data["detail"] == "Not Found"


@pytest.mark.asyncio
async def test_global_handler_catches_unexpected_errors():
    """Verify the global exception handler catches and formats unexpected errors.

    Uses a standalone FastAPI app to avoid interfering with the shared test app.
    """
    from fastapi import FastAPI
    from app.main import global_exception_handler

    error_app = FastAPI()
    error_app.add_exception_handler(Exception, global_exception_handler)

    @error_app.get("/boom")
    async def boom():
        raise RuntimeError("Intentional test error")

    async with AsyncClient(
        transport=ASGITransport(app=error_app, raise_app_exceptions=False),
        base_url="http://test",
    ) as client:
        response = await client.get("/boom")

    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    data = response.json()
    assert data["detail"] == "Internal server error"
    # Must NOT leak the actual exception message
    assert "Intentional test error" not in response.text
