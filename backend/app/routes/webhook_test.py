"""Test webhook endpoint for validating webhook configuration."""

import json
import time
from datetime import datetime, timezone
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import User, get_async_session
from app.models import App
from app.schemas import (
    WebhookTestRequest,
    WebhookTestResponse,
    WebhookRequestPayload,
    WebhookMessagePayload,
)
from app.config import settings
from app.services.webhook_client import validate_webhook_url
from app.services.webhook_signing import sign_webhook_request
from app.users import current_active_user
from app.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(tags=["webhook"])

_DEFAULT_TIMEOUT_S = 8.0


def _build_test_payload(app: App, sample_message: str) -> dict:
    """Build a canonical test payload for webhook validation."""
    payload = WebhookRequestPayload(
        version="1.0",
        event="message_received",
        app={"id": str(app.id), "name": app.name or ""},
        thread={
            "id": "00000000-0000-0000-0000-000000000000",
            "customer_id": "test-customer",
        },
        message=WebhookMessagePayload(
            id="00000000-0000-0000-0000-000000000001",
            seq=1,
            role="user",
            content=sample_message,
        ),
        history_tail=[],
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
    return payload.model_dump()


@router.post("/apps/{app_id}/webhook/test", response_model=WebhookTestResponse)
async def webhook_test(
    app_id: UUID,
    body: WebhookTestRequest,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    """Test a webhook URL with a sample payload. Does NOT persist any messages."""
    # Verify app ownership
    result = await db.execute(
        select(App).filter(App.id == app_id, App.user_id == user.id)
    )
    app = result.scalars().first()
    if not app:
        raise HTTPException(status_code=404, detail="ERROR_APP_NOT_FOUND")

    # Validate URL
    try:
        validate_webhook_url(body.webhook_url)
    except ValueError as exc:
        return WebhookTestResponse(ok=False, error=str(exc))

    # Build test payload
    sample_message = body.sample_message or "Hello"
    payload = _build_test_payload(app, sample_message)

    # Stable JSON serialization for signing
    raw_body = json.dumps(payload, separators=(",", ":"), sort_keys=False)

    headers = {
        "Content-Type": "application/json",
        settings.WEBHOOK_HEADER_APP_ID: str(app.id),
        settings.WEBHOOK_HEADER_THREAD_ID: "00000000-0000-0000-0000-000000000000",
    }

    # Add signature headers if secret is configured
    signature_sent = False
    if app.webhook_secret:
        timestamp, signature = sign_webhook_request(app.webhook_secret, raw_body)
        headers[settings.WEBHOOK_HEADER_TIMESTAMP] = str(timestamp)
        headers[settings.WEBHOOK_HEADER_SIGNATURE] = signature
        signature_sent = True

    # Send request and capture results
    start = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=_DEFAULT_TIMEOUT_S) as client:
            response = await client.post(
                body.webhook_url, json=payload, headers=headers
            )
        latency_ms = int((time.monotonic() - start) * 1000)

        # Try to parse response as JSON
        response_json = None
        try:
            response_json = response.json()
        except Exception:
            pass

        if response.status_code != 200:
            return WebhookTestResponse(
                ok=False,
                status_code=response.status_code,
                latency_ms=latency_ms,
                error="WEBHOOK_TEST_BAD_STATUS",
                response_json=response_json,
                response_text=response.text[:2000],
                signature_sent=signature_sent,
            )

        if response_json is None:
            return WebhookTestResponse(
                ok=False,
                status_code=response.status_code,
                latency_ms=latency_ms,
                error="WEBHOOK_TEST_NOT_JSON",
                response_text=response.text[:2000],
                signature_sent=signature_sent,
            )

        if "reply" not in response_json:
            return WebhookTestResponse(
                ok=False,
                status_code=response.status_code,
                latency_ms=latency_ms,
                error="WEBHOOK_TEST_MISSING_REPLY",
                response_json=response_json,
                signature_sent=signature_sent,
            )

        return WebhookTestResponse(
            ok=True,
            status_code=response.status_code,
            latency_ms=latency_ms,
            response_json=response_json,
            signature_sent=signature_sent,
        )

    except httpx.TimeoutException:
        latency_ms = int((time.monotonic() - start) * 1000)
        return WebhookTestResponse(
            ok=False,
            latency_ms=latency_ms,
            error="WEBHOOK_TEST_TIMEOUT",
            signature_sent=signature_sent,
        )
    except Exception:
        latency_ms = int((time.monotonic() - start) * 1000)
        return WebhookTestResponse(
            ok=False,
            latency_ms=latency_ms,
            error="WEBHOOK_TEST_CONNECTION_ERROR",
            signature_sent=signature_sent,
        )
