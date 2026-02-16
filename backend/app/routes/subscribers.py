from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, literal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_async_session
from app.dependencies import get_app_for_request, get_subscriber_in_app_or_404
from app.models import App, Message, Subscriber, Thread
from app.schemas import CursorPage, SubscriberRead, SubscriberSummary, ThreadSummary
from app.utils import (
    build_desc_pagination_filter,
    decode_cursor,
    encode_cursor,
    parse_datetime,
    parse_uuid,
)

router = APIRouter(tags=["subscribers"])

_DEFAULT_ACTIVITY = datetime(1970, 1, 1, tzinfo=timezone.utc)


def _subscriber_cursor_schema() -> dict[str, any]:
    return {
        "activity_at": parse_datetime,
        "created_at": parse_datetime,
        "id": parse_uuid,
    }


@router.get("/apps/{app_id}/subscribers", response_model=CursorPage[SubscriberSummary])
async def list_subscribers(
    app_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    app: App = Depends(get_app_for_request),
    limit: int = Query(25, ge=1, le=200, description="Max items to return"),
    cursor: str | None = Query(None, description="Opaque cursor for pagination"),
    q: str | None = Query(None, description="Search customer_id and display_name"),
):
    """
    List subscribers for an app with pagination.

    Returns subscribers ordered by last_message_at DESC (most recent first),
    with thread count and optional last message preview.
    Auth: JWT Bearer or X-App-Id + X-App-Secret (app webhook secret).
    """

    limit = min(limit, 200)

    activity_expr = func.coalesce(
        Subscriber.last_message_at, literal(_DEFAULT_ACTIVITY)
    ).label("activity_at")
    last_preview = (
        select(Message.content)
        .join(Thread, Thread.id == Message.thread_id)
        .where(Thread.subscriber_id == Subscriber.id)
        .order_by(Message.created_at.desc())
        .limit(1)
        .correlate(Subscriber)
        .scalar_subquery()
        .label("last_message_preview")
    )

    query = (
        select(
            Subscriber,
            func.count(Thread.id).label("thread_count"),
            last_preview,
            activity_expr,
        )
        .outerjoin(Thread, Thread.subscriber_id == Subscriber.id)
        .filter(Subscriber.app_id == app_id)
        .group_by(Subscriber.id)
    )

    # Apply search filter
    if q:
        search_pattern = f"%{q}%"
        query = query.filter(
            (Subscriber.customer_id.ilike(search_pattern))
            | (Subscriber.display_name.ilike(search_pattern))
        )

    query = query.order_by(
        activity_expr.desc(),
        Subscriber.created_at.desc(),
        Subscriber.id.desc(),
    )

    if cursor:
        cursor_data = decode_cursor(cursor, _subscriber_cursor_schema())
        pagination_clause = build_desc_pagination_filter(
            [activity_expr, Subscriber.created_at, Subscriber.id],
            [
                cursor_data["activity_at"],
                cursor_data["created_at"],
                cursor_data["id"],
            ],
        )
        query = query.filter(pagination_clause)

    result = await db.execute(query.limit(limit + 1))
    rows = result.all()
    has_more = len(rows) > limit
    visible_rows = rows[:limit]

    items = []
    for row in visible_rows:
        subscriber = row.Subscriber
        items.append(
            SubscriberSummary(
                id=subscriber.id,
                app_id=subscriber.app_id,
                customer_id=subscriber.customer_id,
                display_name=subscriber.display_name,
                created_at=subscriber.created_at,
                last_seen_at=subscriber.last_seen_at,
                last_message_at=subscriber.last_message_at,
                thread_count=row.thread_count,
                last_message_preview=row.last_message_preview,
            )
        )

    next_cursor = None
    if has_more and visible_rows:
        last_row = visible_rows[-1]
        next_cursor = encode_cursor(
            {
                "activity_at": last_row.activity_at,
                "created_at": last_row.Subscriber.created_at,
                "id": last_row.Subscriber.id,
            }
        )

    return CursorPage(items=items, next_cursor=next_cursor)


@router.get("/apps/{app_id}/subscribers/{subscriber_id}", response_model=SubscriberRead)
async def get_subscriber(
    app_id: UUID,
    subscriber_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    subscriber: Subscriber = Depends(get_subscriber_in_app_or_404),
):
    """Get subscriber detail. Auth: JWT Bearer or X-App-Id + X-App-Secret."""
    return subscriber


@router.get(
    "/apps/{app_id}/subscribers/{subscriber_id}/threads",
    response_model=CursorPage[ThreadSummary],
)
async def list_subscriber_threads(
    app_id: UUID,
    subscriber_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    subscriber: Subscriber = Depends(get_subscriber_in_app_or_404),
    limit: int = Query(25, ge=1, le=200, description="Max items to return"),
    cursor: str | None = Query(None, description="Opaque cursor for pagination"),
):
    """
    List threads for a subscriber with pagination.

    Returns threads ordered by updated_at DESC (most recent first),
    with message count and optional last message preview.
    Auth: JWT Bearer or X-App-Id + X-App-Secret.
    """

    limit = min(limit, 200)

    last_preview = (
        select(Message.content)
        .where(Message.thread_id == Thread.id)
        .order_by(Message.created_at.desc())
        .limit(1)
        .correlate(Thread)
        .scalar_subquery()
        .label("last_message_preview")
    )

    query = (
        select(
            Thread,
            func.count(Message.id).label("message_count"),
            func.max(Message.created_at).label("last_message_at"),
            last_preview,
        )
        .outerjoin(Message, Message.thread_id == Thread.id)
        .filter(
            Thread.app_id == app_id,
            Thread.subscriber_id == subscriber_id,
        )
        .group_by(Thread.id)
        .order_by(Thread.updated_at.desc(), Thread.id.desc())
    )

    if cursor:
        cursor_data = decode_cursor(
            cursor,
            {
                "updated_at": parse_datetime,
                "id": parse_uuid,
            },
        )
        pagination_clause = build_desc_pagination_filter(
            [Thread.updated_at, Thread.id],
            [cursor_data["updated_at"], cursor_data["id"]],
        )
        query = query.filter(pagination_clause)

    result = await db.execute(query.limit(limit + 1))
    rows = result.all()
    has_more = len(rows) > limit
    visible_rows = rows[:limit]

    items = []
    for row in visible_rows:
        thread = row.Thread
        items.append(
            ThreadSummary(
                id=thread.id,
                app_id=thread.app_id,
                subscriber_id=thread.subscriber_id,
                title=thread.title,
                status=thread.status,
                customer_id=thread.customer_id,
                created_at=thread.created_at,
                updated_at=thread.updated_at,
                message_count=row.message_count,
                last_message_at=row.last_message_at,
                last_message_preview=row.last_message_preview,
            )
        )

    next_cursor = None
    if has_more and visible_rows:
        last_row = visible_rows[-1]
        next_cursor = encode_cursor(
            {
                "updated_at": last_row.Thread.updated_at,
                "id": last_row.Thread.id,
            }
        )

    return CursorPage(items=items, next_cursor=next_cursor)
