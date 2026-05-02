"""mental map node source_ref for document-linked nodes

Revision ID: f3a8b9c0d1e2
Revises: e2f3a4b5c6d7
Create Date: 2026-04-05

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f3a8b9c0d1e2"
down_revision: Union[str, None] = "e2f3a4b5c6d7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "mental_map_nodes",
        sa.Column("source_ref", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("mental_map_nodes", "source_ref")
