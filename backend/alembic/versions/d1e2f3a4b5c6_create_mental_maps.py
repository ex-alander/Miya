"""create mental maps and nodes

Revision ID: d1e2f3a4b5c6
Revises: c5f4d8b3a9e1
Create Date: 2026-02-15

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, None] = "c5f4d8b3a9e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "mental_maps",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_mental_maps_id", "mental_maps", ["id"])
    op.create_index("ix_mental_maps_user_id", "mental_maps", ["user_id"])

    op.create_table(
        "mental_map_nodes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("map_id", sa.Integer(), nullable=False),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("x", sa.Float(), nullable=False),
        sa.Column("y", sa.Float(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("mastery_state", sa.String(length=20), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["map_id"], ["mental_maps.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["parent_id"], ["mental_map_nodes.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_mental_map_nodes_id", "mental_map_nodes", ["id"])
    op.create_index("ix_mental_map_nodes_map_id", "mental_map_nodes", ["map_id"])
    op.create_index("ix_mental_map_nodes_parent_id", "mental_map_nodes", ["parent_id"])


def downgrade() -> None:
    op.drop_index("ix_mental_map_nodes_parent_id", table_name="mental_map_nodes")
    op.drop_index("ix_mental_map_nodes_map_id", table_name="mental_map_nodes")
    op.drop_index("ix_mental_map_nodes_id", table_name="mental_map_nodes")
    op.drop_table("mental_map_nodes")
    op.drop_index("ix_mental_maps_user_id", table_name="mental_maps")
    op.drop_index("ix_mental_maps_id", table_name="mental_maps")
    op.drop_table("mental_maps")
