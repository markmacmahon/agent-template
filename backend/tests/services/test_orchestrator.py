import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.orchestrator import ChatOrchestrator
from app.services.webhook_client import WebhookError
from app.schemas import RunResult


def _make_app(
    mode="simulator",
    webhook_url=None,
    config_overrides=None,
):
    """Create a mock App object for orchestrator tests."""
    config = {"integration": {"mode": mode}}
    if config_overrides:
        config.update(config_overrides)

    app = MagicMock()
    app.id = "app-123"
    app.name = "Test App"
    app.webhook_url = webhook_url
    app.webhook_secret = None
    app.config_json = config
    return app


def _make_thread():
    thread = MagicMock()
    thread.id = "thread-456"
    thread.customer_id = "cust-789"
    return thread


class TestChatOrchestrator:
    @pytest.mark.asyncio
    async def test_simulator_mode(self):
        """Simulator mode generates a reply via SimulatorHandler."""
        app = _make_app(mode="simulator")
        thread = _make_thread()

        result = await ChatOrchestrator.run(app, thread, "Hello")

        assert result.source == "simulator"
        assert result.reply_text is not None
        assert result.pending is False

    @pytest.mark.asyncio
    async def test_simulator_mode_with_config(self):
        """Simulator mode uses scenario from config."""
        app = _make_app(
            mode="simulator",
            config_overrides={
                "simulator": {"scenario": "ecommerce_support", "disclaimer": True}
            },
        )
        thread = _make_thread()

        result = await ChatOrchestrator.run(app, thread, "Where is my order?")

        assert result.source == "simulator"
        assert "[Simulated]" in result.reply_text

    @pytest.mark.asyncio
    async def test_webhook_mode_success(self):
        """Webhook mode calls external webhook and returns reply."""
        app = _make_app(mode="webhook", webhook_url="https://example.com/hook")
        thread = _make_thread()

        mock_result = RunResult(reply_text="Webhook says hi", source="webhook", pending=False)

        with patch("app.services.orchestrator.WebhookClient") as mock_cls:
            mock_instance = AsyncMock()
            mock_instance.send_sync.return_value = mock_result
            mock_cls.return_value = mock_instance

            result = await ChatOrchestrator.run(app, thread, "Hello")

        assert result.source == "webhook"
        assert result.reply_text == "Webhook says hi"

    @pytest.mark.asyncio
    async def test_webhook_mode_no_url_falls_back_to_simulator(self):
        """Webhook mode without webhook_url silently uses simulator."""
        app = _make_app(mode="webhook", webhook_url=None)
        thread = _make_thread()

        result = await ChatOrchestrator.run(app, thread, "Hello")

        assert result.source == "simulator"
        assert result.metadata.get("reason") == "webhook_not_configured"
        assert result.reply_text is not None

    @pytest.mark.asyncio
    async def test_webhook_mode_failure_returns_error(self):
        """Webhook failure returns error, does NOT fall back to simulator."""
        app = _make_app(mode="webhook", webhook_url="https://example.com/hook")
        thread = _make_thread()

        with patch("app.services.orchestrator.WebhookClient") as mock_cls:
            mock_instance = AsyncMock()
            mock_instance.send_sync.side_effect = WebhookError("timed out")
            mock_cls.return_value = mock_instance

            result = await ChatOrchestrator.run(app, thread, "Hello")

        assert result.reply_text is None
        assert result.source == "webhook"
        assert "error" in result.metadata

    @pytest.mark.asyncio
    async def test_legacy_webhook_sync_maps_to_webhook(self):
        """Legacy 'webhook_sync' mode maps to 'webhook'."""
        app = _make_app(mode="webhook_sync", webhook_url="https://example.com/hook")
        thread = _make_thread()

        mock_result = RunResult(reply_text="OK", source="webhook", pending=False)

        with patch("app.services.orchestrator.WebhookClient") as mock_cls:
            mock_instance = AsyncMock()
            mock_instance.send_sync.return_value = mock_result
            mock_cls.return_value = mock_instance

            result = await ChatOrchestrator.run(app, thread, "Hello")

        assert result.source == "webhook"

    @pytest.mark.asyncio
    async def test_legacy_hybrid_maps_to_webhook(self):
        """Legacy 'hybrid' mode maps to 'webhook'."""
        app = _make_app(mode="hybrid", webhook_url="https://example.com/hook")
        thread = _make_thread()

        mock_result = RunResult(reply_text="OK", source="webhook", pending=False)

        with patch("app.services.orchestrator.WebhookClient") as mock_cls:
            mock_instance = AsyncMock()
            mock_instance.send_sync.return_value = mock_result
            mock_cls.return_value = mock_instance

            result = await ChatOrchestrator.run(app, thread, "Hello")

        assert result.source == "webhook"

    @pytest.mark.asyncio
    async def test_unknown_mode_defaults_to_simulator(self):
        """Unknown integration mode falls back to simulator."""
        app = _make_app(mode="unknown_mode")
        thread = _make_thread()

        result = await ChatOrchestrator.run(app, thread, "Hello")

        assert result.source == "simulator"

    @pytest.mark.asyncio
    async def test_missing_config_defaults_to_simulator(self):
        """App with empty config_json defaults to simulator mode."""
        app = MagicMock()
        app.id = "app-123"
        app.name = "Test"
        app.webhook_url = None
        app.config_json = {}
        thread = _make_thread()

        result = await ChatOrchestrator.run(app, thread, "Hello")

        assert result.source == "simulator"


class TestChatOrchestratorStream:
    @pytest.mark.asyncio
    async def test_stream_simulator_yields_chunks(self):
        """Streaming simulator yields delta and done events."""
        app = _make_app(mode="simulator")
        thread = _make_thread()

        events = []
        async for event in ChatOrchestrator.run_stream(app, thread, "Hello"):
            events.append(event)

        # Should have meta, at least one delta, and done
        event_types = [e["event"] for e in events]
        assert "meta" in event_types
        assert "delta" in event_types
        assert "done" in event_types

    @pytest.mark.asyncio
    async def test_stream_webhook_proxies_sse(self):
        """Streaming webhook proxies SSE bytes from partner."""
        app = _make_app(mode="webhook", webhook_url="https://example.com/hook")
        thread = _make_thread()

        async def fake_sse(*args, **kwargs):
            yield b"event: delta\ndata: {\"text\": \"Hi\"}\n\n"
            yield b"event: done\ndata: {}\n\n"

        with patch("app.services.orchestrator.WebhookClient") as mock_cls:
            mock_instance = MagicMock()
            mock_instance.send_stream = fake_sse
            mock_cls.return_value = mock_instance

            events = []
            async for event in ChatOrchestrator.run_stream(app, thread, "Hello"):
                events.append(event)

        # Should have meta event, then raw proxy bytes
        assert events[0]["event"] == "meta"
        # Remaining events are raw proxied bytes
        raw_events = [e for e in events if e["event"] == "raw"]
        assert len(raw_events) == 2

    @pytest.mark.asyncio
    async def test_stream_webhook_no_url_falls_back_to_simulator(self):
        """Streaming webhook without URL falls back to simulator stream."""
        app = _make_app(mode="webhook", webhook_url=None)
        thread = _make_thread()

        events = []
        async for event in ChatOrchestrator.run_stream(app, thread, "Hello"):
            events.append(event)

        event_types = [e["event"] for e in events]
        assert "meta" in event_types
        assert "delta" in event_types

        # Meta should indicate fallback
        meta = next(e for e in events if e["event"] == "meta")
        assert meta["data"]["reason"] == "webhook_not_configured"

    @pytest.mark.asyncio
    async def test_stream_webhook_failure_yields_error(self):
        """Streaming webhook failure yields error event."""
        app = _make_app(mode="webhook", webhook_url="https://example.com/hook")
        thread = _make_thread()

        async def failing_sse(*args, **kwargs):
            raise WebhookError("connection refused")
            yield  # noqa: RET503 - make this an async generator

        with patch("app.services.orchestrator.WebhookClient") as mock_cls:
            mock_instance = MagicMock()
            mock_instance.send_stream = failing_sse
            mock_cls.return_value = mock_instance

            events = []
            async for event in ChatOrchestrator.run_stream(app, thread, "Hello"):
                events.append(event)

        event_types = [e["event"] for e in events]
        assert "error" in event_types
        assert "done" in event_types
