import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.webhook_client import (
    validate_webhook_url,
    WebhookClient,
    WebhookError,
)


class TestValidateWebhookUrl:
    def test_valid_https_url(self):
        assert validate_webhook_url("https://example.com/webhook") is True

    def test_valid_http_url(self):
        assert validate_webhook_url("http://example.com/webhook") is True

    def test_rejects_localhost(self):
        with pytest.raises(ValueError, match="blocked"):
            validate_webhook_url("http://localhost/webhook")

    def test_rejects_127_0_0_1(self):
        with pytest.raises(ValueError, match="blocked"):
            validate_webhook_url("http://127.0.0.1/webhook")

    def test_rejects_link_local(self):
        with pytest.raises(ValueError, match="blocked"):
            validate_webhook_url("http://169.254.1.1/webhook")

    def test_rejects_non_http_scheme(self):
        with pytest.raises(ValueError, match="scheme"):
            validate_webhook_url("ftp://example.com/file")

    def test_rejects_empty_url(self):
        with pytest.raises(ValueError):
            validate_webhook_url("")

    def test_rejects_no_host(self):
        with pytest.raises(ValueError):
            validate_webhook_url("http://")


class TestWebhookClient:
    @pytest.mark.asyncio
    async def test_send_sync_success(self):
        """Sync webhook call returns reply text on success."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"reply": "Hello from webhook"}

        with patch("app.services.webhook_client.httpx.AsyncClient") as mock_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = mock_client

            client = WebhookClient(url="https://example.com/webhook", timeout_ms=5000)
            result = await client.send_sync(payload={"message": "hi"})

        assert result.reply_text == "Hello from webhook"
        assert result.source == "webhook"
        assert result.pending is False

    @pytest.mark.asyncio
    async def test_send_sync_with_custom_headers(self):
        """Sync webhook passes custom headers to the request."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"reply": "OK"}

        with patch("app.services.webhook_client.httpx.AsyncClient") as mock_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = mock_client

            client = WebhookClient(url="https://example.com/webhook")
            custom_headers = {"X-App-Id": "app-123"}
            await client.send_sync(payload={}, headers=custom_headers)

            # Verify headers were passed through
            call_kwargs = mock_client.post.call_args
            assert call_kwargs.kwargs["headers"]["X-App-Id"] == "app-123"

    @pytest.mark.asyncio
    async def test_send_sync_timeout(self):
        """Sync webhook raises WebhookError on timeout."""
        import httpx

        with patch("app.services.webhook_client.httpx.AsyncClient") as mock_cls:
            mock_client = AsyncMock()
            mock_client.post.side_effect = httpx.TimeoutException("timed out")
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = mock_client

            client = WebhookClient(url="https://example.com/webhook", timeout_ms=5000)
            with pytest.raises(WebhookError, match="timed out"):
                await client.send_sync(payload={"message": "hi"})

    @pytest.mark.asyncio
    async def test_send_sync_http_error(self):
        """Sync webhook raises WebhookError on non-200 status."""
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"

        with patch("app.services.webhook_client.httpx.AsyncClient") as mock_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = mock_client

            client = WebhookClient(url="https://example.com/webhook", timeout_ms=5000)
            with pytest.raises(WebhookError, match="500"):
                await client.send_sync(payload={"message": "hi"})

    @pytest.mark.asyncio
    async def test_send_sync_missing_reply_field(self):
        """Webhook raises error when response lacks 'reply' field."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"text": "no reply field"}

        with patch("app.services.webhook_client.httpx.AsyncClient") as mock_cls:
            mock_client = AsyncMock()
            mock_client.post.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = mock_client

            client = WebhookClient(url="https://example.com/webhook")
            with pytest.raises(WebhookError, match="reply"):
                await client.send_sync(payload={})

    @pytest.mark.asyncio
    async def test_validates_url_on_init(self):
        """WebhookClient validates URL during construction."""
        with pytest.raises(ValueError, match="blocked"):
            WebhookClient(url="http://localhost/webhook", timeout_ms=5000)

    @pytest.mark.asyncio
    async def test_send_stream_proxies_sse(self):
        """Streaming webhook yields SSE events from partner."""

        async def fake_stream():
            chunks = [
                b"event: delta\ndata: {\"text\": \"Hello\"}\n\n",
                b"event: delta\ndata: {\"text\": \" world\"}\n\n",
                b"event: done\ndata: {}\n\n",
            ]
            for chunk in chunks:
                yield chunk

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.headers = {"content-type": "text/event-stream"}
        mock_response.aiter_bytes = fake_stream
        mock_response.aclose = AsyncMock()

        with patch("app.services.webhook_client.httpx.AsyncClient") as mock_cls:
            mock_client = AsyncMock()
            mock_client.send.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = mock_client

            client = WebhookClient(url="https://example.com/webhook")
            chunks = []
            async for chunk in client.send_stream(payload={}, headers={}):
                chunks.append(chunk)

        assert len(chunks) == 3
        assert b"Hello" in chunks[0]
        assert b"world" in chunks[1]
        assert b"done" in chunks[2]

    @pytest.mark.asyncio
    async def test_send_stream_timeout(self):
        """Streaming webhook raises WebhookError on timeout."""
        import httpx

        with patch("app.services.webhook_client.httpx.AsyncClient") as mock_cls:
            mock_client = AsyncMock()
            mock_client.send.side_effect = httpx.TimeoutException("timed out")
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = mock_client

            client = WebhookClient(url="https://example.com/webhook")
            with pytest.raises(WebhookError, match="timed out"):
                async for _ in client.send_stream(payload={}, headers={}):
                    pass

    @pytest.mark.asyncio
    async def test_send_stream_non_sse_response(self):
        """Streaming webhook raises error if partner returns non-SSE content type."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.headers = {"content-type": "application/json"}
        mock_response.json.return_value = {"reply": "Not a stream"}
        mock_response.text = '{"reply": "Not a stream"}'
        mock_response.aclose = AsyncMock()

        with patch("app.services.webhook_client.httpx.AsyncClient") as mock_cls:
            mock_client = AsyncMock()
            mock_client.send.return_value = mock_response
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_cls.return_value = mock_client

            client = WebhookClient(url="https://example.com/webhook")
            with pytest.raises(WebhookError, match="Expected SSE"):
                async for _ in client.send_stream(payload={}, headers={}):
                    pass
