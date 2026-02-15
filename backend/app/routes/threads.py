from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi_pagination import Page, Params
from fastapi_pagination.ext.sqlalchemy import apaginate
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.database import User, get_async_session
from app.models import App, Thread
from app.schemas import ThreadRead, ThreadCreate, ThreadUpdate
from app.users import current_active_user

router = APIRouter(tags=["threads"])


async def get_app_by_id(
    app_id: UUID,
    db: AsyncSession,
    user: User,
) -> App:
    """Get app by ID and verify ownership."""
    result = await db.execute(
        select(App).filter(App.id == app_id, App.user_id == user.id)
    )
    app = result.scalars().first()

    if not app:
        raise HTTPException(status_code=404, detail="App not found or not authorized")

    return app


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
        raise HTTPException(
            status_code=404, detail="Thread not found or not authorized"
        )

    return thread


def transform_threads(threads):
    return [ThreadRead.model_validate(thread) for thread in threads]


@router.post("/apps/{app_id}/threads", response_model=ThreadRead)
async def create_thread(
    app_id: UUID,
    thread: ThreadCreate,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    """Create a new thread for the specified app."""
    # Verify app ownership
    await get_app_by_id(app_id, db, user)

    # Create thread
    db_thread = Thread(**thread.model_dump(), app_id=app_id)
    db.add(db_thread)
    await db.commit()
    await db.refresh(db_thread)
    return db_thread


@router.get("/apps/{app_id}/threads", response_model=Page[ThreadRead])
async def list_threads(
    app_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    customer_id: str | None = Query(None, description="Filter by customer ID"),
    status: str | None = Query(None, description="Filter by status"),
):
    """List threads for the specified app, ordered by updated_at desc."""
    # Verify app ownership
    await get_app_by_id(app_id, db, user)

    params = Params(page=page, size=size)
    query = select(Thread).filter(Thread.app_id == app_id)

    if customer_id:
        query = query.filter(Thread.customer_id == customer_id)

    if status:
        query = query.filter(Thread.status == status)

    query = query.order_by(Thread.updated_at.desc())

    return await apaginate(db, query, params, transformer=transform_threads)


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

    await db.delete(thread)
    await db.commit()

    return {"message": "Thread successfully deleted"}
