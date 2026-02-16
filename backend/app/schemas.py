import uuid
from datetime import datetime
from typing import Literal, Any, TypeVar, Generic

from fastapi_users import schemas
from pydantic import BaseModel, Field, field_validator
from uuid import UUID

T = TypeVar("T")

IntegrationMode = Literal["simulator", "webhook"]

# ISO 639-1 two-letter language codes. Default is always English.
SUPPORTED_LOCALES = ("en", "es", "pt")
DEFAULT_LOCALE = "en"


class CursorPage(BaseModel, Generic[T]):
    items: list[T]
    next_cursor: str | None = None


class UserRead(schemas.BaseUser[uuid.UUID]):
    locale: str = DEFAULT_LOCALE


class UserCreate(schemas.BaseUserCreate):
    locale: str = DEFAULT_LOCALE


class UserUpdate(schemas.BaseUserUpdate):
    locale: str | None = None

    @field_validator("locale")
    @classmethod
    def locale_must_be_supported(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if v not in SUPPORTED_LOCALES:
            raise ValueError(f"locale must be one of {SUPPORTED_LOCALES}")
        return v


class AppBase(BaseModel):
    name: str
    description: str | None = None


class AppCreate(AppBase):
    webhook_url: str | None = None
    webhook_secret: str | None = None
    config_json: dict[str, Any] = Field(default_factory=dict)


class AppUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    webhook_url: str | None = None
    webhook_secret: str | None = None
    config_json: dict[str, Any] | None = None


class AppRead(AppBase):
    id: UUID
    user_id: UUID
    webhook_url: str | None = None
    webhook_secret: str | None = None
    config_json: dict[str, Any] = Field(default_factory=dict)

    model_config = {"from_attributes": True}

    @classmethod
    def mask_secret(cls, app: "AppRead") -> "AppRead":
        """Return a copy with webhook_secret masked."""
        if app.webhook_secret:
            app = app.model_copy(update={"webhook_secret": "••••••"})
        return app


# --- Run / Orchestration schemas ---


class RunResult(BaseModel):
    reply_text: str | None = None
    source: Literal["simulator", "webhook"] | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    pending: bool = False


class RunResponse(BaseModel):
    status: Literal["completed", "error"]
    assistant_message: "MessageRead | None" = None
    error: str | None = None


# --- Canonical webhook payload (single source of truth) ---


class WebhookMessagePayload(BaseModel):
    """The message portion of the webhook request."""

    id: str
    seq: int
    role: str = "user"
    content: str
    content_json: dict[str, Any] = Field(default_factory=dict)


class WebhookHistoryEntry(BaseModel):
    """A single entry in the history_tail array."""

    role: str
    content: str
    content_json: dict[str, Any] = Field(default_factory=dict)


class WebhookRequestPayload(BaseModel):
    """Canonical webhook request payload v1.

    This is the single source of truth for what we send to webhooks.
    Used in: webhook calls, test endpoint, UI documentation.
    """

    version: str = "1.0"
    event: str = "message_received"
    app: dict[str, str]
    thread: dict[str, str | None]
    message: WebhookMessagePayload
    history_tail: list[WebhookHistoryEntry] = Field(default_factory=list)
    timestamp: str


# --- Test webhook schemas ---


class WebhookTestRequest(BaseModel):
    webhook_url: str
    sample_message: str | None = "Hello"


class WebhookTestResponse(BaseModel):
    ok: bool
    status_code: int | None = None
    latency_ms: int = 0
    error: str | None = None
    response_json: dict[str, Any] | None = None
    response_text: str | None = None
    signature_sent: bool = False


# Thread schemas
class ThreadBase(BaseModel):
    title: str | None = None
    customer_id: str | None = Field(None, max_length=128)


class ThreadCreate(ThreadBase):
    pass


class ThreadUpdate(BaseModel):
    title: str | None = None
    status: Literal["active", "archived", "deleted"] | None = None


class ThreadRead(ThreadBase):
    id: UUID
    app_id: UUID
    subscriber_id: UUID | None = None
    status: Literal["active", "archived", "deleted"]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# Message schemas
class MessageBase(BaseModel):
    content: str | None = None
    content_json: dict = Field(default_factory=dict)


class MessageCreate(MessageBase):
    """Create message schema - role is always 'user' for public endpoint."""

    pass


class MessageCreateInternal(MessageBase):
    """Internal schema allowing role specification (for assistant responses)."""

    role: Literal["user", "assistant", "system", "tool"]


class MessageRead(BaseModel):
    id: UUID
    thread_id: UUID
    seq: int
    role: Literal["user", "assistant", "system", "tool"]
    content: str | None = None
    content_json: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class ThreadCreateResponse(BaseModel):
    """Response when creating a thread: thread plus initial greeting (when no user message)."""

    thread: ThreadRead
    initial_message: MessageRead


# Subscriber schemas
class SubscriberBase(BaseModel):
    customer_id: str
    display_name: str | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class SubscriberCreate(SubscriberBase):
    pass


class SubscriberUpdate(BaseModel):
    display_name: str | None = None
    metadata_json: dict[str, Any] | None = None


class SubscriberRead(SubscriberBase):
    id: UUID
    app_id: UUID
    created_at: datetime
    last_seen_at: datetime | None = None
    last_message_at: datetime | None = None

    model_config = {"from_attributes": True}


class SubscriberSummary(BaseModel):
    """Subscriber summary with thread count for list views."""

    id: UUID
    app_id: UUID
    customer_id: str
    display_name: str | None = None
    created_at: datetime
    last_seen_at: datetime | None = None
    last_message_at: datetime | None = None
    thread_count: int = 0
    last_message_preview: str | None = None

    model_config = {"from_attributes": True}


class ThreadSummary(BaseModel):
    """Thread summary with message count for list views."""

    id: UUID
    app_id: UUID
    subscriber_id: UUID | None = None
    title: str | None = None
    status: Literal["active", "archived", "deleted"]
    customer_id: str | None = None
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    last_message_at: datetime | None = None
    last_message_preview: str | None = None

    model_config = {"from_attributes": True}
