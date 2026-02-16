"""Shared FastAPI dependencies for authorization and resource access."""

import secrets
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import User, get_async_session
from app.models import App, Thread, Subscriber
from app.users import current_active_user


async def _get_user_from_bearer_token(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> User | None:
    """Extract and validate JWT from Authorization Bearer; return User or None."""
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        return None
    token = auth[7:].strip()
    if not token:
        return None
    try:
        payload = jwt.decode(
            token,
            settings.ACCESS_SECRET_KEY,
            audience=["fastapi-users:auth"],
            algorithms=[settings.ALGORITHM],
        )
    except jwt.PyJWTError:
        return None
    sub = payload.get("sub")
    if not sub:
        return None
    try:
        user_id = UUID(sub) if isinstance(sub, str) else sub
    except (TypeError, ValueError):
        return None
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    return user


async def get_app_for_request(
    app_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> App:
    """
    Resolve app for Partner API: accept either App ID + Secret headers or JWT.
    Use in routes under /apps/{app_id}/... to allow partner auth without login.
    """
    app_id_header = settings.WEBHOOK_HEADER_APP_ID
    secret_header = settings.WEBHOOK_HEADER_APP_SECRET
    header_app_id_raw = request.headers.get(app_id_header)
    header_secret = request.headers.get(secret_header)

    if header_app_id_raw and header_secret is not None:
        try:
            header_app_id = UUID(header_app_id_raw)
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=401, detail="ERROR_PARTNER_API_INVALID_APP_HEADER"
            )
        if header_app_id != app_id:
            raise HTTPException(
                status_code=401, detail="ERROR_PARTNER_API_APP_ID_MISMATCH"
            )
        result = await db.execute(select(App).filter(App.id == app_id))
        app = result.scalars().first()
        if not app or not app.webhook_secret:
            raise HTTPException(
                status_code=401, detail="ERROR_PARTNER_API_APP_OR_SECRET_INVALID"
            )
        if not secrets.compare_digest(header_secret, app.webhook_secret):
            raise HTTPException(
                status_code=401, detail="ERROR_PARTNER_API_APP_OR_SECRET_INVALID"
            )
        return app

    user = await _get_user_from_bearer_token(request, db)
    if user:
        result = await db.execute(
            select(App).filter(App.id == app_id, App.user_id == user.id)
        )
        app = result.scalars().first()
        if app:
            return app
        # Authenticated but app not found or not owned → 404 (same as get_app_or_404)
        raise HTTPException(status_code=404, detail="ERROR_APP_NOT_FOUND")

    raise HTTPException(status_code=401, detail="ERROR_PARTNER_API_UNAUTHORIZED")


async def get_app_or_404(
    app_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
) -> App:
    """Get app by ID and verify ownership."""
    result = await db.execute(
        select(App).filter(App.id == app_id, App.user_id == user.id)
    )
    app = result.scalars().first()

    if not app:
        raise HTTPException(status_code=404, detail="ERROR_APP_NOT_FOUND")

    return app


async def get_subscriber_in_app_or_404(
    app_id: UUID,
    subscriber_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    app: App = Depends(get_app_for_request),
) -> Subscriber:
    """Get subscriber by ID and verify it belongs to the app (JWT or app-secret auth)."""
    if app.id != app_id:
        raise HTTPException(status_code=404, detail="ERROR_SUBSCRIBER_NOT_FOUND")
    result = await db.execute(
        select(Subscriber).filter(
            Subscriber.id == subscriber_id, Subscriber.app_id == app_id
        )
    )
    subscriber = result.scalars().first()
    if not subscriber:
        raise HTTPException(status_code=404, detail="ERROR_SUBSCRIBER_NOT_FOUND")
    return subscriber


async def get_thread_in_app_or_404(
    app_id: UUID,
    thread_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    app: App = Depends(get_app_for_request),
) -> Thread:
    """Get thread by ID and verify it belongs to the app (JWT or app-secret auth)."""
    if app.id != app_id:
        raise HTTPException(status_code=404, detail="ERROR_THREAD_NOT_FOUND")
    result = await db.execute(
        select(Thread)
        .filter(Thread.id == thread_id, Thread.app_id == app_id)
        .options(selectinload(Thread.app))
    )
    thread = result.scalars().first()
    if not thread:
        raise HTTPException(status_code=404, detail="ERROR_THREAD_NOT_FOUND")
    return thread


async def get_thread_in_app_with_lock(
    app_id: UUID,
    thread_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    app: App = Depends(get_app_for_request),
) -> Thread:
    """Get thread by ID with row lock for seq allocation (JWT or app-secret auth)."""
    if app.id != app_id:
        raise HTTPException(status_code=404, detail="ERROR_THREAD_NOT_FOUND")
    result = await db.execute(
        select(Thread)
        .filter(Thread.id == thread_id, Thread.app_id == app_id)
        .with_for_update()
    )
    thread = result.scalars().first()
    if not thread:
        raise HTTPException(status_code=404, detail="ERROR_THREAD_NOT_FOUND")
    return thread
