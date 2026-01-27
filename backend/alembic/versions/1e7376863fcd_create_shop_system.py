"""create_shop_system

Revision ID: 1e7376863fcd
Revises: 9996f9fe8f76
Create Date: 2026-01-19 20:50:04.711330

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '1e7376863fcd'
down_revision: Union[str, None] = '9996f9fe8f76'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create shop_items table
    op.create_table(
        'shop_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('price', sa.Integer(), nullable=False),
        sa.Column('item_type', sa.String(length=50), nullable=False),
        sa.Column('effect_data', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('icon', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_shop_items_id'), 'shop_items', ['id'], unique=False)
    
    # Create user_inventory table
    op.create_table(
        'user_inventory',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('shop_item_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('purchased_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['shop_item_id'], ['shop_items.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_inventory_id'), 'user_inventory', ['id'], unique=False)
    op.create_index(op.f('ix_user_inventory_shop_item_id'), 'user_inventory', ['shop_item_id'], unique=False)
    op.create_index(op.f('ix_user_inventory_user_id'), 'user_inventory', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_inventory_user_id'), table_name='user_inventory')
    op.drop_index(op.f('ix_user_inventory_shop_item_id'), table_name='user_inventory')
    op.drop_index(op.f('ix_user_inventory_id'), table_name='user_inventory')
    op.drop_table('user_inventory')
    op.drop_index(op.f('ix_shop_items_id'), table_name='shop_items')
    op.drop_table('shop_items')

