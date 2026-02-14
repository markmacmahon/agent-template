"""rename items to apps

Revision ID: 2324b9d0281a
Revises: b389592974f8
Create Date: 2026-02-14 17:12:44.410602

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "2324b9d0281a"
down_revision: Union[str, None] = "b389592974f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename table from items to apps
    op.rename_table("items", "apps")

    # Drop the quantity column
    op.drop_column("apps", "quantity")


def downgrade() -> None:
    # Add back the quantity column
    op.add_column("apps", sa.Column("quantity", sa.Integer(), nullable=True))

    # Rename table back from apps to items
    op.rename_table("apps", "items")
