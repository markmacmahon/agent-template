"""Run endpoints: sync (POST /run) and streaming (GET /run/stream)."""

import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.future import select

from app.database import User, get_async_session, get_session_factory
from app.models import App, Thread, Message
from app.schemas import MessageRead, RunResponse
from app.services.message_service import persist_assistant_message
from app.services.orchestrator import ChatOrchestrator
from app.users import current_active_user
from app.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(tags=["run"])

_HISTORY_LIMIT = 10


async def _get_thread_with_app(
    app_id: UUID,
    thread_id: UUID,
    db: AsyncSession,
    user: User,
) -> tuple[App, Thread]:
    """Load app and thread, verifying ownership."""
    app_result = await db.execute(
        select(App).filter(App.id == app_id, App.user_id == user.id)
    )
    app = app_result.scalars().first()
    if not app:
        raise HTTPException(status_code=404, detail="ERROR_APP_NOT_FOUND")

    thread_result = await db.execute(
        select(Thread).filter(Thread.id == thread_id, Thread.app_id == app_id)
    )
    thread = thread_result.scalars().first()
    if not thread:
        raise HTTPException(status_code=404, detail="ERROR_THREAD_NOT_FOUND")

    return app, thread


async def _get_last_user_message(thread_id: UUID, db: AsyncSession) -> Message | None:
    """Get the most recent user message in the thread."""
    result = await db.execute(
        select(Message)
        .filter(Message.thread_id == thread_id, Message.role == "user")
        .order_by(Message.seq.desc())
        .limit(1)
    )
    return result.scalars().first()


async def _get_history(thread_id: UUID, db: AsyncSession) -> list[Message]:
    """Get the last N messages for history_tail."""
    result = await db.execute(
        select(Message)
        .filter(Message.thread_id == thread_id)
        .order_by(Message.seq.desc())
        .limit(_HISTORY_LIMIT)
    )
    messages = list(result.scalars().all())
    messages.reverse()  # Oldest first
    return messages


# --- Sync endpoint ---


@router.post("/apps/{app_id}/threads/{thread_id}/run", response_model=RunResponse)
async def run_sync(
    app_id: UUID,
    thread_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    """Run the orchestrator synchronously and return JSON result."""
    app, thread = await _get_thread_with_app(app_id, thread_id, db, user)

    last_msg = await _get_last_user_message(thread_id, db)
    if not last_msg:
        raise HTTPException(status_code=400, detail="ERROR_NO_USER_MESSAGES")

    history = await _get_history(thread_id, db)

    result = await ChatOrchestrator.run(
        app, thread, last_msg.content or "", message=last_msg, history=history
    )

    if result.reply_text is None:
        return RunResponse(
            status="error",
            assistant_message=None,
            error=result.metadata.get("error", "ERROR_NO_REPLY"),
        )

    # Build content_json with source metadata
    content_json = {}
    if result.metadata:
        content_json["source"] = result.source
        if "reason" in result.metadata:
            content_json["reason"] = result.metadata["reason"]

    # Persist assistant message
    msg = await persist_assistant_message(
        thread, result.reply_text, db, content_json=content_json
    )
    return RunResponse(
        status="completed",
        assistant_message=MessageRead.model_validate(msg),
    )


# --- SSE streaming endpoint ---


@router.get("/apps/{app_id}/threads/{thread_id}/run/stream")
async def run_stream(
    app_id: UUID,
    thread_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
    session_factory: async_sessionmaker = Depends(get_session_factory),
):
    """Run the orchestrator and stream the response as SSE.

    If the partner returns SSE (text/event-stream), their stream is proxied
    directly to the client. Otherwise, the orchestrator generates simulator
    chunks locally.
    """
    app, thread = await _get_thread_with_app(app_id, thread_id, db, user)

    last_msg = await _get_last_user_message(thread_id, db)
    if not last_msg:
        raise HTTPException(status_code=400, detail="ERROR_NO_USER_MESSAGES")

    history = await _get_history(thread_id, db)

    async def event_generator():
        full_text = ""
        source = "simulator"
        reason = None

        async for event in ChatOrchestrator.run_stream(
            app, thread, last_msg.content or "", message=last_msg, history=history
        ):
            event_type = event["event"]
            data = event["data"]

            if event_type == "meta":
                source = data.get("source", "simulator")
                reason = data.get("reason")
                yield _sse_event("meta", json.dumps(data))

            elif event_type == "raw":
                # Proxied SSE bytes from partner webhook — pass through as-is
                if isinstance(data, bytes):
                    yield data.decode("utf-8", errors="replace")
                else:
                    yield str(data)

            elif event_type == "delta":
                full_text += data.get("text", "")
                yield _sse_event("delta", json.dumps(data))

            elif event_type == "error":
                yield _sse_event("error", json.dumps(data))

            elif event_type == "done":
                status = data.get("status", "completed")

                if status == "completed" and full_text:
                    # Use a dedicated session so the connection is always
                    # returned to the pool, even if the client disconnects
                    # mid-stream (the DI session may outlive the generator).
                    content_json: dict = {"source": source}
                    if reason:
                        content_json["reason"] = reason

                    async with session_factory() as stream_db:
                        msg = await persist_assistant_message(
                            thread, full_text, stream_db, content_json=content_json
                        )
                    yield _sse_event(
                        "done",
                        json.dumps(
                            {
                                "status": "completed",
                                "message_id": str(msg.id),
                                "seq": msg.seq,
                            }
                        ),
                    )
                else:
                    yield _sse_event("done", json.dumps(data))

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _sse_event(event: str, data: str) -> str:
    """Format a single SSE event."""
    return f"event: {event}\ndata: {data}\n\n"
