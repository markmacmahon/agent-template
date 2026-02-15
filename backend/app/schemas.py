import uuid
from datetime import datetime
from typing import Literal

from fastapi_users import schemas
from pydantic import BaseModel, Field
from uuid import UUID


class UserRead(schemas.BaseUser[uuid.UUID]):
    pass


class UserCreate(schemas.BaseUserCreate):
    pass


class UserUpdate(schemas.BaseUserUpdate):
    pass


class AppBase(BaseModel):
    name: str
    description: str | None = None


class AppCreate(AppBase):
    pass


class AppUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class AppRead(AppBase):
    id: UUID
    user_id: UUID

    model_config = {"from_attributes": True}


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
