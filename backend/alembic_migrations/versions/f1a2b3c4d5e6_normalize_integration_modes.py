"""normalize_integration_modes

Revision ID: f1a2b3c4d5e6
Revises: e4a06651998f
Create Date: 2026-02-15 02:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "e4a06651998f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Map legacy integration modes to 'webhook'.

    webhook_sync, webhook_async, hybrid -> webhook
    """
    op.execute(
        """
        UPDATE apps
        SET config_json = jsonb_set(
            config_json,
            '{integration,mode}',
            '"webhook"'
        )
        WHERE config_json->'integration'->>'mode' IN (
            'webhook_sync', 'webhook_async', 'hybrid'
        )
        """
    )


def downgrade() -> None:
    """No-op: we cannot recover which legacy mode was used."""
    pass
