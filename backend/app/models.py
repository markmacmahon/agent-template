from datetime import datetime, timezone
from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import (
    Column,
    String,
    ForeignKey,
    Integer,
    Text,
    DateTime,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from uuid import uuid4


class Base(DeclarativeBase):
    pass


class User(SQLAlchemyBaseUserTableUUID, Base):
    apps = relationship("App", back_populates="user", cascade="all, delete-orphan")


class App(Base):
    __tablename__ = "apps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    webhook_url = Column(String, nullable=True)
    webhook_secret = Column(String, nullable=True)
    config_json = Column(JSONB, nullable=False, default=dict, server_default="{}")

    user = relationship("User", back_populates="apps")
    threads = relationship("Thread", back_populates="app", cascade="all, delete-orphan")


class Thread(Base):
    __tablename__ = "threads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    app_id = Column(
        UUID(as_uuid=True), ForeignKey("apps.id", ondelete="CASCADE"), nullable=False
    )
    title = Column(String, nullable=True)
    status = Column(
        String(20), nullable=False, default="active"
    )  # active, archived, deleted
    customer_id = Column(String(128), nullable=True)
    next_seq = Column(Integer, nullable=False, default=1)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    app = relationship("App", back_populates="threads")
    messages = relationship(
        "Message",
        back_populates="thread",
        cascade="all, delete-orphan",
        order_by="Message.seq",
    )

    __table_args__ = (
        Index("ix_threads_app_created", "app_id", "created_at"),
        Index("ix_threads_app_customer", "app_id", "customer_id"),
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    thread_id = Column(
        UUID(as_uuid=True),
        ForeignKey("threads.id", ondelete="CASCADE"),
        nullable=False,
    )
    seq = Column(Integer, nullable=False)
    role = Column(String(20), nullable=False)  # user, assistant, system, tool
    content = Column(Text, nullable=True)
    content_json = Column(JSONB, nullable=False, default=dict, server_default="{}")
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    thread = relationship("Thread", back_populates="messages")

    __table_args__ = (
        UniqueConstraint("thread_id", "seq", name="uq_thread_seq"),
        Index("ix_messages_thread_seq", "thread_id", "seq"),
    )
