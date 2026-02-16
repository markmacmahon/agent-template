"""Helpers for subscriber resolution and bookkeeping."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models import Subscriber


async def resolve_subscriber(
    db: AsyncSession,
    *,
    app_id: UUID,
    customer_id: str,
    display_name: str | None = None,
) -> Subscriber:
    """Get or create a subscriber for (app, customer)."""
    result = await db.execute(
        select(Subscriber).filter(
            Subscriber.app_id == app_id,
            Subscriber.customer_id == customer_id,
        )
    )
    subscriber = result.scalars().first()
    now = datetime.now(timezone.utc)

    if subscriber:
        subscriber.last_seen_at = now
        return subscriber

    subscriber = Subscriber(
        app_id=app_id,
        customer_id=customer_id,
        display_name=display_name or customer_id,
        last_seen_at=now,
    )
    db.add(subscriber)
    await db.flush()
    return subscriber
