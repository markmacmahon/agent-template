"""Webhook client for sending events to external webhook endpoints."""

import logging
from collections.abc import AsyncIterator
from typing import Any
from urllib.parse import urlparse

import httpx

from app.schemas import RunResult

logger = logging.getLogger(__name__)

# Hosts that must never be called as webhooks
_BLOCKED_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0"}  # noqa: S104
_BLOCKED_PREFIXES = ("169.254.", "10.", "192.168.")


class WebhookError(Exception):
    """Raised when a webhook call fails."""


def validate_webhook_url(url: str) -> bool:
    """Validate that a webhook URL is safe to call.

    Raises ValueError if the URL is invalid or targets a blocked host.
    """
    if not url:
        raise ValueError("Webhook URL must not be empty")

    parsed = urlparse(url)

    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"Webhook URL must use http or https scheme, got '{parsed.scheme}'")

    host = parsed.hostname or ""
    if not host:
        raise ValueError("Webhook URL must have a host")

    if host in _BLOCKED_HOSTS:
        raise ValueError(f"Webhook URL host '{host}' is blocked")

    if any(host.startswith(prefix) for prefix in _BLOCKED_PREFIXES):
        raise ValueError(f"Webhook URL host '{host}' is blocked (private network)")

    return True


class WebhookClient:
    """HTTP client for webhook integrations."""

    def __init__(self, url: str, timeout_ms: int = 8000) -> None:
        validate_webhook_url(url)
        self.url = url
        self.timeout_s = timeout_ms / 1000.0

    async def send_sync(
        self,
        payload: dict[str, Any],
        headers: dict[str, str] | None = None,
    ) -> RunResult:
        """Send a synchronous webhook request and return the reply.

        Raises WebhookError on timeout, non-200 response, invalid JSON, or missing reply.
        """
        request_headers = headers or {}

        try:
            async with httpx.AsyncClient(timeout=self.timeout_s) as client:
                response = await client.post(
                    self.url, json=payload, headers=request_headers
                )
        except httpx.TimeoutException as exc:
            logger.warning("Webhook timed out: %s", self.url)
            raise WebhookError(f"Webhook timed out: {exc}") from exc
        except httpx.HTTPError as exc:
            logger.warning("Webhook HTTP error: %s - %s", self.url, exc)
            raise WebhookError(f"Webhook request failed: {exc}") from exc

        if response.status_code != 200:
            logger.warning(
                "Webhook returned %s: %s", response.status_code, response.text[:200]
            )
            raise WebhookError(
                f"Webhook returned HTTP {response.status_code}: {response.text[:200]}"
            )

        try:
            data = response.json()
        except Exception as exc:
            raise WebhookError(f"Invalid JSON response from webhook: {exc}") from exc

        reply_text = data.get("reply")
        if reply_text is None:
            raise WebhookError("Webhook response missing required 'reply' field")

        return RunResult(
            reply_text=str(reply_text),
            source="webhook",
            metadata={
                "status_code": response.status_code,
                **({"webhook_metadata": data["metadata"]} if "metadata" in data else {}),
            },
            pending=False,
        )

    async def send_stream(
        self,
        payload: dict[str, Any],
        headers: dict[str, str] | None = None,
    ) -> AsyncIterator[bytes]:
        """Send a webhook request expecting an SSE stream response.

        The partner returns Content-Type: text/event-stream and we proxy
        the raw SSE bytes through to our caller.

        Raises WebhookError on timeout, non-200, or non-SSE content type.
        """
        request_headers = headers or {}

        try:
            async with httpx.AsyncClient(timeout=self.timeout_s) as client:
                request = client.build_request(
                    "POST", self.url, json=payload, headers=request_headers
                )
                response = await client.send(request, stream=True)

                if response.status_code != 200:
                    body = (await response.aread()).decode("utf-8", errors="replace")
                    await response.aclose()
                    raise WebhookError(
                        f"Webhook returned HTTP {response.status_code}: {body[:200]}"
                    )

                content_type = response.headers.get("content-type", "")
                if "text/event-stream" not in content_type:
                    await response.aclose()
                    raise WebhookError(
                        f"Expected SSE (text/event-stream) but got '{content_type}'"
                    )

                try:
                    async for chunk in response.aiter_bytes():
                        yield chunk
                finally:
                    await response.aclose()

        except httpx.TimeoutException as exc:
            logger.warning("Webhook stream timed out: %s", self.url)
            raise WebhookError(f"Webhook timed out: {exc}") from exc
        except httpx.HTTPError as exc:
            logger.warning("Webhook stream HTTP error: %s - %s", self.url, exc)
            raise WebhookError(f"Webhook request failed: {exc}") from exc
