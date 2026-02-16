"""backfill thread subscriber references

Revision ID: b6e4f6b537d0
Revises: a27da95f3137
Create Date: 2026-02-16 00:19:00.000000

"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import Session

# revision identifiers, used by Alembic.
revision: str = "b6e4f6b537d0"
down_revision: str = "a27da95f3137"
branch_labels = None
depends_on = None

threads = sa.table(
    "threads",
    sa.column("id", sa.UUID()),
    sa.column("app_id", sa.UUID()),
    sa.column("customer_id", sa.String()),
    sa.column("subscriber_id", sa.UUID()),
    sa.column("updated_at", sa.DateTime(timezone=True)),
)

subscribers = sa.table(
    "subscribers",
    sa.column("id", sa.UUID()),
    sa.column("app_id", sa.UUID()),
    sa.column("customer_id", sa.String()),
    sa.column("display_name", sa.Text()),
    sa.column("metadata_json", sa.JSON()),
    sa.column("created_at", sa.DateTime(timezone=True)),
    sa.column("last_seen_at", sa.DateTime(timezone=True)),
    sa.column("last_message_at", sa.DateTime(timezone=True)),
)


def upgrade() -> None:
    bind = op.get_bind()
    session = Session(bind=bind)
    now = datetime.now(timezone.utc)

    try:
        rows = session.execute(
            sa.select(
                threads.c.id,
                threads.c.app_id,
                threads.c.customer_id,
                threads.c.subscriber_id,
                threads.c.updated_at,
            ).where(threads.c.customer_id.isnot(None))
        ).fetchall()

        for row in rows:
            if not row.customer_id:
                continue

            subscriber_id = row.subscriber_id
            if subscriber_id is None:
                subscriber_id = session.execute(
                    sa.select(subscribers.c.id).where(
                        (subscribers.c.app_id == row.app_id)
                        & (subscribers.c.customer_id == row.customer_id)
                    )
                ).scalar()

            if subscriber_id is None:
                subscriber_id = uuid4()
                created_ts = row.updated_at or now
                session.execute(
                    subscribers.insert().values(
                        id=subscriber_id,
                        app_id=row.app_id,
                        customer_id=row.customer_id,
                        display_name=row.customer_id,
                        metadata_json={},
                        created_at=created_ts,
                        last_seen_at=created_ts,
                        last_message_at=row.updated_at,
                    )
                )

            if row.subscriber_id is None:
                session.execute(
                    threads.update()
                    .where(threads.c.id == row.id)
                    .values(subscriber_id=subscriber_id)
                )

        session.commit()
    finally:
        session.close()


def downgrade() -> None:
    # No-op: data backfill cannot be reliably reversed.
    pass
