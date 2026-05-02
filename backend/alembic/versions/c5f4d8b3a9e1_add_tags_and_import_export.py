"""add tags, hints and import/export log

Revision ID: c5f4d8b3a9e1
Revises: 9b811d30661b
Create Date: 2026-01-27 15:30:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c5f4d8b3a9e1"
down_revision: Union[str, None] = "9b811d30661b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Deck & Card tags / hints
    op.add_column("decks", sa.Column("tags", sa.Text(), nullable=True))
    op.add_column("cards", sa.Column("tags", sa.Text(), nullable=True))
    op.add_column("cards", sa.Column("hint", sa.Text(), nullable=True))

    # Import / export history log
    op.create_table(
        "import_export_logs",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("deck_id", sa.Integer(), sa.ForeignKey("decks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(length=20), nullable=False),
        sa.Column("format", sa.String(length=20), nullable=False),
        sa.Column("total_cards", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("details", sa.Text(), nullable=True),
    )
    op.create_index("ix_import_export_logs_user_id", "import_export_logs", ["user_id"])
    op.create_index("ix_import_export_logs_deck_id", "import_export_logs", ["deck_id"])


def downgrade() -> None:
    op.drop_index("ix_import_export_logs_deck_id", table_name="import_export_logs")
    op.drop_index("ix_import_export_logs_user_id", table_name="import_export_logs")
    op.drop_table("import_export_logs")

    op.drop_column("cards", "hint")
    op.drop_column("cards", "tags")
    op.drop_column("decks", "tags")

