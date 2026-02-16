"""Webhook client for sending events to external webhook endpoints."""

from collections.abc import AsyncIterator
from typing import Any
from urllib.parse import urlparse

import httpx

from app.config import settings
from app.schemas import RunResult
from app.i18n import t
from app.logging_config import get_logger

logger = get_logger(__name__)

# Hosts that must never be called as webhooks (unless they are the backend host, e.g. local dev)
_BLOCKED_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0"}  # noqa: S104
_BLOCKED_PREFIXES = ("169.254.", "10.", "192.168.")


def _backend_host() -> str | None:
    """Host of BACKEND_URL; webhook URLs to this host are allowed when it's normally blocked."""
    parsed = urlparse(settings.BACKEND_URL)
    return parsed.hostname if parsed.hostname else None


class WebhookError(Exception):
    """Raised when a webhook call fails."""


def validate_webhook_url(url: str) -> bool:
    """Validate that a webhook URL is safe to call.

    Raises ValueError if the URL is invalid or targets a blocked host.
    The host from BACKEND_URL is allowed (so when the backend is on localhost, localhost webhooks work).
    """
    if not url:
        raise ValueError(t("WEBHOOK_URL_EMPTY"))

    parsed = urlparse(url)

    if parsed.scheme not in ("http", "https"):
        raise ValueError(t("WEBHOOK_URL_BAD_SCHEME", scheme=parsed.scheme))

    host = parsed.hostname or ""
    if not host:
        raise ValueError(t("WEBHOOK_URL_NO_HOST"))

    backend_host = _backend_host()
    if backend_host and host == backend_host and host in _BLOCKED_HOSTS:
        return True

    if host in _BLOCKED_HOSTS:
        raise ValueError(t("WEBHOOK_URL_BLOCKED", host=host))

    if any(host.startswith(prefix) for prefix in _BLOCKED_PREFIXES):
        raise ValueError(t("WEBHOOK_URL_BLOCKED_PRIVATE", host=host))

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
            raise WebhookError(t("WEBHOOK_TIMEOUT", detail=exc)) from exc
        except httpx.HTTPError as exc:
            logger.warning("Webhook HTTP error: %s - %s", self.url, exc)
            raise WebhookError(t("WEBHOOK_REQUEST_FAILED", detail=exc)) from exc

        if response.status_code != 200:
            logger.warning(
                "Webhook returned %s: %s", response.status_code, response.text[:200]
            )
            raise WebhookError(
                t(
                    "WEBHOOK_BAD_STATUS",
                    status=response.status_code,
                    body=response.text[:200],
                )
            )

        try:
            data = response.json()
        except Exception as exc:
            raise WebhookError(t("WEBHOOK_INVALID_JSON", detail=exc)) from exc

        reply_text = data.get("reply")
        if reply_text is None:
            raise WebhookError(t("WEBHOOK_MISSING_REPLY"))

        return RunResult(
            reply_text=str(reply_text),
            source="webhook",
            metadata={
                "status_code": response.status_code,
                **(
                    {"webhook_metadata": data["metadata"]} if "metadata" in data else {}
                ),
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
                        t(
                            "WEBHOOK_BAD_STATUS",
                            status=response.status_code,
                            body=body[:200],
                        )
                    )

                content_type = response.headers.get("content-type", "")
                if "text/event-stream" not in content_type:
                    await response.aclose()
                    raise WebhookError(
                        t("WEBHOOK_BAD_CONTENT_TYPE", content_type=content_type)
                    )

                try:
                    async for chunk in response.aiter_bytes():
                        yield chunk
                finally:
                    await response.aclose()

        except httpx.TimeoutException as exc:
            logger.warning("Webhook stream timed out: %s", self.url)
            raise WebhookError(t("WEBHOOK_TIMEOUT", detail=exc)) from exc
        except httpx.HTTPError as exc:
            logger.warning("Webhook stream HTTP error: %s - %s", self.url, exc)
            raise WebhookError(t("WEBHOOK_REQUEST_FAILED", detail=exc)) from exc
