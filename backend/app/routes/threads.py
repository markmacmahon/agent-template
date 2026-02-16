from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.database import User, get_async_session
from app.dependencies import get_app_for_request
from app.i18n import t
from app.models import App, Subscriber, Thread
from app.schemas import (
    CursorPage,
    MessageRead,
    ThreadCreate,
    ThreadCreateResponse,
    ThreadRead,
    ThreadUpdate,
)
from app.services.message_service import persist_assistant_message
from app.services.subscriber_service import resolve_subscriber
from app.users import current_active_user
from app.utils import (
    build_desc_pagination_filter,
    decode_cursor,
    encode_cursor,
    parse_datetime,
    parse_uuid,
)

router = APIRouter(tags=["threads"])


async def get_thread_by_id(
    thread_id: UUID,
    db: AsyncSession,
    user: User,
) -> Thread:
    """Get thread by ID and verify ownership through app."""
    result = await db.execute(
        select(Thread)
        .join(App)
        .filter(Thread.id == thread_id, App.user_id == user.id)
        .options(selectinload(Thread.app))
    )
    thread = result.scalars().first()

    if not thread:
        raise HTTPException(status_code=404, detail="ERROR_THREAD_NOT_FOUND")

    return thread


@router.post("/apps/{app_id}/threads", response_model=ThreadCreateResponse)
async def create_thread(
    app_id: UUID,
    thread: ThreadCreate,
    db: AsyncSession = Depends(get_async_session),
    app: App = Depends(get_app_for_request),
):
    """Create a new thread for the specified app.

    When no user message is provided (default), the backend adds an initial
    assistant greeting as the clear entry point. The greeting is returned
    in the response so the UI can show it instantly without a second request.
    Auth: JWT Bearer or X-App-Id + X-App-Secret.
    """

    # Get or create subscriber when customer_id is provided
    subscriber_id = None
    if thread.customer_id:
        subscriber = await resolve_subscriber(
            db,
            app_id=app_id,
            customer_id=thread.customer_id,
        )
        subscriber_id = subscriber.id

    # Create thread
    db_thread = Thread(
        **thread.model_dump(), app_id=app_id, subscriber_id=subscriber_id
    )
    db.add(db_thread)
    await db.commit()
    await db.refresh(db_thread)

    # Initial greeting when no user message: streamed back in response for instant display
    greeting_msg = await persist_assistant_message(
        db_thread, t("SIM_GREETING"), db, content_json={"source": "system"}
    )
    await db.refresh(db_thread)

    return ThreadCreateResponse(
        thread=ThreadRead.model_validate(db_thread),
        initial_message=MessageRead.model_validate(greeting_msg),
    )


@router.get("/apps/{app_id}/threads", response_model=CursorPage[ThreadRead])
async def list_threads(
    app_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    app: App = Depends(get_app_for_request),
    limit: int = Query(25, ge=1, le=200, description="Max items to return"),
    cursor: str | None = Query(None, description="Opaque cursor for pagination"),
    customer_id: str | None = Query(None, description="Filter by customer ID"),
    status: str | None = Query(None, description="Filter by status"),
):
    """List threads for the specified app, ordered by updated_at desc. Auth: JWT or X-App-Id + X-App-Secret."""

    limit = min(limit, 200)
    query = select(Thread).filter(Thread.app_id == app_id)

    if customer_id:
        query = query.filter(Thread.customer_id == customer_id)

    if status:
        query = query.filter(Thread.status == status)

    query = query.order_by(Thread.updated_at.desc(), Thread.id.desc())

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
    rows = result.scalars().all()
    has_more = len(rows) > limit
    visible_rows = rows[:limit]
    items = [ThreadRead.model_validate(row) for row in visible_rows]

    next_cursor = None
    if has_more and visible_rows:
        last_row = visible_rows[-1]
        next_cursor = encode_cursor(
            {
                "updated_at": last_row.updated_at,
                "id": last_row.id,
            }
        )

    return CursorPage(items=items, next_cursor=next_cursor)


@router.get("/threads/{thread_id}", response_model=ThreadRead)
async def get_thread(
    thread_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    """Get a specific thread by ID."""
    thread = await get_thread_by_id(thread_id, db, user)
    return thread


@router.patch("/threads/{thread_id}", response_model=ThreadRead)
async def update_thread(
    thread_id: UUID,
    thread_update: ThreadUpdate,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    """Update a thread."""
    thread = await get_thread_by_id(thread_id, db, user)

    # Update fields
    update_data = thread_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(thread, field, value)

    # Update timestamp
    thread.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(thread)
    return thread


@router.delete("/threads/{thread_id}")
async def delete_thread(
    thread_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    """Delete a thread."""
    thread = await get_thread_by_id(thread_id, db, user)

    subscriber_id = thread.subscriber_id
    await db.delete(thread)

    # Clean up orphaned subscriber
    if subscriber_id:
        result = await db.execute(
            select(func.count())
            .select_from(Thread)
            .filter(Thread.subscriber_id == subscriber_id)
        )
        if result.scalar() == 0:
            subscriber = await db.get(Subscriber, subscriber_id)
            if subscriber:
                await db.delete(subscriber)

    await db.commit()

    return {"message": "ACTION_THREAD_DELETED"}
