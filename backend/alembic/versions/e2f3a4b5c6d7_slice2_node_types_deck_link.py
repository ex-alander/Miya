"""Slice 2: node types, deck link, card_links, card source

Revision ID: e2f3a4b5c6d7
Revises: d1e2f3a4b5c6
Create Date: 2026-02-15

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e2f3a4b5c6d7"
down_revision: Union[str, None] = "d1e2f3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("mental_map_nodes", sa.Column("node_type", sa.String(20), nullable=False, server_default="simple"))
    with op.batch_alter_table("decks", schema=None) as batch_op:
        batch_op.add_column(sa.Column("node_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_decks_node_id",
            "mental_map_nodes",
            ["node_id"],
            ["id"],
            ondelete="CASCADE",
        )
        batch_op.create_index("ix_decks_node_id", ["node_id"], unique=False)

    op.add_column("cards", sa.Column("source", sa.Text(), nullable=True))

    op.create_table(
        "card_links",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("from_card_id", sa.Integer(), sa.ForeignKey("cards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("to_card_id", sa.Integer(), sa.ForeignKey("cards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("relation_type", sa.String(20), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
    )
    op.create_index("ix_card_links_from_card_id", "card_links", ["from_card_id"])
    op.create_index("ix_card_links_to_card_id", "card_links", ["to_card_id"])
    op.create_index("ix_card_links_relation", "card_links", ["relation_type"])

    op.create_table(
        "card_positions",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("card_id", sa.Integer(), sa.ForeignKey("cards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("x", sa.Float(), nullable=False, default=0),
        sa.Column("y", sa.Float(), nullable=False, default=0),
    )
    op.create_index("ix_card_positions_card_id", "card_positions", ["card_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_card_positions_card_id", table_name="card_positions")
    op.drop_table("card_positions")
    op.drop_index("ix_card_links_relation", table_name="card_links")
    op.drop_index("ix_card_links_to_card_id", table_name="card_links")
    op.drop_index("ix_card_links_from_card_id", table_name="card_links")
    op.drop_table("card_links")
    op.drop_column("cards", "source")
    with op.batch_alter_table("decks", schema=None) as batch_op:
        batch_op.drop_index("ix_decks_node_id", if_exists=True)
        batch_op.drop_constraint("fk_decks_node_id", type_="foreignkey")
        batch_op.drop_column("node_id")
    op.drop_column("mental_map_nodes", "node_type")
