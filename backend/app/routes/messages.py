from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import User, get_async_session
from app.models import App, Thread, Message
from app.schemas import MessageRead, MessageCreate
from app.users import current_active_user

router = APIRouter(tags=["messages"])


async def get_thread_with_lock(
    thread_id: UUID,
    app_id: UUID,
    db: AsyncSession,
    user: User,
) -> Thread:
    """
    Get thread by ID, verify ownership and app_id, and lock the row for seq allocation.
    Uses SELECT FOR UPDATE to prevent race conditions.
    """
    result = await db.execute(
        select(Thread)
        .join(App)
        .filter(Thread.id == thread_id, Thread.app_id == app_id, App.user_id == user.id)
        .with_for_update()  # Lock the thread row
    )
    thread = result.scalars().first()

    if not thread:
        raise HTTPException(
            status_code=404, detail="Thread not found or not authorized"
        )

    return thread


async def get_thread_by_id(
    thread_id: UUID,
    app_id: UUID,
    db: AsyncSession,
    user: User,
) -> Thread:
    """
    Get thread by ID and verify ownership and app_id (no lock).
    """
    result = await db.execute(
        select(Thread)
        .join(App)
        .filter(Thread.id == thread_id, Thread.app_id == app_id, App.user_id == user.id)
    )
    thread = result.scalars().first()

    if not thread:
        raise HTTPException(
            status_code=404, detail="Thread not found or not authorized"
        )

    return thread


@router.get(
    "/apps/{app_id}/threads/{thread_id}/messages", response_model=list[MessageRead]
)
async def list_messages(
    app_id: UUID,
    thread_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
    before_seq: int | None = Query(
        None, description="Get messages before this sequence number (cursor pagination)"
    ),
    limit: int = Query(
        50, ge=1, le=200, description="Maximum number of messages to return"
    ),
):
    """
    List messages for a thread with cursor-based pagination.
    Messages are ordered by seq ascending (oldest first).
    """
    # Verify thread ownership (no lock needed for reads)
    await get_thread_by_id(thread_id, app_id, db, user)

    # Build query
    query = select(Message).filter(Message.thread_id == thread_id)

    if before_seq is not None:
        query = query.filter(Message.seq < before_seq)

    query = query.order_by(Message.seq.asc()).limit(limit)

    result = await db.execute(query)
    messages = result.scalars().all()

    return [MessageRead.model_validate(msg) for msg in messages]


@router.post("/apps/{app_id}/threads/{thread_id}/messages", response_model=MessageRead)
async def create_message(
    app_id: UUID,
    thread_id: UUID,
    message: MessageCreate,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    """
    Append a new user message to the thread.

    This endpoint:
    1. Locks the thread row (SELECT FOR UPDATE)
    2. Reads and increments next_seq atomically
    3. Creates the message with role="user" and the allocated seq
    4. Updates thread.updated_at

    This approach guarantees concurrency-safe seq allocation.
    """
    # Get thread with lock to ensure atomic seq allocation
    thread = await get_thread_with_lock(thread_id, app_id, db, user)

    # Allocate sequence number
    allocated_seq = thread.next_seq
    thread.next_seq += 1
    thread.updated_at = datetime.now(timezone.utc)

    # Create message with allocated seq and role="user"
    db_message = Message(
        thread_id=thread_id,
        seq=allocated_seq,
        role="user",
        **message.model_dump(),
    )

    db.add(db_message)
    await db.commit()
    await db.refresh(db_message)

    return db_message


@router.post(
    "/apps/{app_id}/threads/{thread_id}/messages/assistant", response_model=MessageRead
)
async def create_assistant_message(
    app_id: UUID,
    thread_id: UUID,
    message: MessageCreate,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    """
    Create an assistant message (for dashboard simulation).

    This allows the business owner to manually reply as the assistant
    through the dashboard UI.
    """
    # Get thread with lock to ensure atomic seq allocation
    thread = await get_thread_with_lock(thread_id, app_id, db, user)

    # Allocate sequence number
    allocated_seq = thread.next_seq
    thread.next_seq += 1
    thread.updated_at = datetime.now(timezone.utc)

    # Create message with role="assistant"
    db_message = Message(
        thread_id=thread_id,
        seq=allocated_seq,
        role="assistant",
        **message.model_dump(),
    )

    db.add(db_message)
    await db.commit()
    await db.refresh(db_message)

    return db_message


@router.get("/messages/{message_id}", response_model=MessageRead)
async def get_message(
    message_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    """Get a specific message by ID."""
    result = await db.execute(
        select(Message)
        .join(Thread)
        .join(App)
        .filter(Message.id == message_id, App.user_id == user.id)
    )
    message = result.scalars().first()

    if not message:
        raise HTTPException(
            status_code=404, detail="Message not found or not authorized"
        )

    return message
