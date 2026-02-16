"""ChatOrchestrator -- central routing logic for integration modes."""

import json
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from typing import Any

from app.schemas import (
    RunResult,
    WebhookRequestPayload,
    WebhookMessagePayload,
    WebhookHistoryEntry,
)
from app.services.simulator import SimulatorHandler
from app.services.webhook_signing import sign_webhook_request
from app.config import settings
from app.services.webhook_client import WebhookClient, WebhookError
from app.logging_config import get_logger

logger = get_logger(__name__)

HISTORY_TAIL_LIMIT = 10


def _get_mode(config_json: dict[str, Any]) -> str:
    """Extract integration mode, mapping legacy values."""
    integration = config_json.get("integration", {})
    mode = integration.get("mode", "simulator")
    # Map legacy values
    if mode in ("webhook_sync", "webhook_async", "hybrid"):
        return "webhook"
    return mode


def _get_simulator_config(config_json: dict[str, Any]) -> dict[str, Any]:
    return config_json.get("simulator", {})


def _get_webhook_timeout(config_json: dict[str, Any]) -> int:
    webhook_cfg = config_json.get("webhook", {})
    return webhook_cfg.get("timeout_ms", 8000)


def _build_webhook_headers(
    app: Any,
    thread: Any,
    raw_body: str,
) -> dict[str, str]:
    """Build webhook headers, including HMAC signature if secret is configured."""
    headers = {
        "Content-Type": "application/json",
        settings.WEBHOOK_HEADER_APP_ID: str(app.id),
        settings.WEBHOOK_HEADER_THREAD_ID: str(thread.id),
    }

    if app.webhook_secret:
        timestamp, signature = sign_webhook_request(app.webhook_secret, raw_body)
        headers[settings.WEBHOOK_HEADER_TIMESTAMP] = str(timestamp)
        headers[settings.WEBHOOK_HEADER_SIGNATURE] = signature

    return headers


def _serialize_payload(payload_dict: dict[str, Any]) -> str:
    """Serialize payload to a stable JSON string for signing."""
    return json.dumps(payload_dict, separators=(",", ":"), sort_keys=False)


def _build_payload_dict(
    app: Any,
    thread: Any,
    user_message: str,
    message: Any = None,
    history: list[Any] | None = None,
) -> dict[str, Any]:
    """Build the payload dict from either a message object or raw text."""
    if message:
        payload = build_webhook_payload(app, thread, message, history)
        return payload.model_dump()
    return {
        "version": "1.0",
        "event": "message_received",
        "app": {"id": str(app.id), "name": app.name or ""},
        "thread": {"id": str(thread.id), "customer_id": thread.customer_id},
        "message": {"content": user_message},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def build_webhook_payload(
    app: Any,
    thread: Any,
    message: Any,
    history: list[Any] | None = None,
) -> WebhookRequestPayload:
    """Build the canonical webhook request payload.

    This is the single source of truth for the webhook contract.
    """
    history_tail = []
    if history:
        for msg in history[-HISTORY_TAIL_LIMIT:]:
            history_tail.append(
                WebhookHistoryEntry(
                    role=msg.role,
                    content=msg.content or "",
                    content_json=msg.content_json or {},
                )
            )

    return WebhookRequestPayload(
        version="1.0",
        event="message_received",
        app={
            "id": str(app.id),
            "name": app.name or "",
        },
        thread={
            "id": str(thread.id),
            "customer_id": thread.customer_id,
        },
        message=WebhookMessagePayload(
            id=str(message.id),
            seq=message.seq,
            role=message.role,
            content=message.content or "",
            content_json=message.content_json or {},
        ),
        history_tail=history_tail,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


class ChatOrchestrator:
    """Routes chat interactions based on app config.

    Resolution rule:
    - if mode == "webhook" AND webhook_url exists → call webhook
    - otherwise → simulator
    - if webhook fails → return error (no fallback)
    """

    @staticmethod
    async def run(
        app: Any,
        thread: Any,
        user_message: str,
        message: Any = None,
        history: list[Any] | None = None,
    ) -> RunResult:
        config = app.config_json or {}
        mode = _get_mode(config)

        if mode == "webhook" and app.webhook_url:
            return await ChatOrchestrator._handle_webhook(
                app, thread, user_message, config, message, history
            )

        # Simulator (default, or webhook mode without URL)
        result = ChatOrchestrator._handle_simulator(user_message, config)

        if mode == "webhook" and not app.webhook_url:
            result.metadata["source"] = "simulator"
            result.metadata["reason"] = "webhook_not_configured"

        return result

    @staticmethod
    def _handle_simulator(user_message: str, config: dict[str, Any]) -> RunResult:
        simulator_config = _get_simulator_config(config)
        handler = SimulatorHandler(simulator_config)
        return handler.generate(user_message)

    @staticmethod
    async def run_stream(
        app: Any,
        thread: Any,
        user_message: str,
        message: Any = None,
        history: list[Any] | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """Streaming variant of run(). Yields structured event dicts.

        Event format: {"event": str, "data": dict | bytes}
        Events: meta, delta, done, error, raw (proxied partner SSE bytes)
        """
        config = app.config_json or {}
        mode = _get_mode(config)

        # Webhook mode with URL: proxy SSE from partner
        if mode == "webhook" and app.webhook_url:
            yield {"event": "meta", "data": {"source": "webhook"}}

            timeout_ms = _get_webhook_timeout(config)
            client = WebhookClient(url=app.webhook_url, timeout_ms=timeout_ms)

            payload_dict = _build_payload_dict(
                app, thread, user_message, message, history
            )
            raw_body = _serialize_payload(payload_dict)
            wh_headers = _build_webhook_headers(app, thread, raw_body)

            try:
                async for chunk in client.send_stream(payload_dict, headers=wh_headers):
                    yield {"event": "raw", "data": chunk}
            except WebhookError as exc:
                logger.error("Webhook stream failed for app %s: %s", app.id, exc)
                yield {"event": "error", "data": {"message": str(exc)}}
                yield {"event": "done", "data": {"status": "error"}}
            return

        # Simulator (default, or webhook mode without URL)
        meta: dict[str, Any] = {"source": "simulator"}
        if mode == "webhook" and not app.webhook_url:
            meta["reason"] = "webhook_not_configured"

        yield {"event": "meta", "data": meta}

        simulator_config = _get_simulator_config(config)
        handler = SimulatorHandler(simulator_config)
        result = handler.generate(user_message)

        text = result.reply_text or ""
        chunk_size = 20
        for i in range(0, len(text), chunk_size):
            yield {"event": "delta", "data": {"text": text[i : i + chunk_size]}}

        yield {"event": "done", "data": {"status": "completed", "full_text": text}}

    @staticmethod
    async def _handle_webhook(
        app: Any,
        thread: Any,
        user_message: str,
        config: dict[str, Any],
        message: Any = None,
        history: list[Any] | None = None,
    ) -> RunResult:
        timeout_ms = _get_webhook_timeout(config)
        client = WebhookClient(url=app.webhook_url, timeout_ms=timeout_ms)

        payload_dict = _build_payload_dict(app, thread, user_message, message, history)
        raw_body = _serialize_payload(payload_dict)
        headers = _build_webhook_headers(app, thread, raw_body)

        try:
            return await client.send_sync(payload_dict, headers=headers)
        except WebhookError as exc:
            logger.error("Webhook failed for app %s: %s", app.id, exc)
            return RunResult(
                reply_text=None,
                source="webhook",
                metadata={"error": str(exc)},
                pending=False,
            )
