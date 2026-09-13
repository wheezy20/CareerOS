"""add education table

Revision ID: 85dc307735b7
Revises: 568c7655f224
Create Date: 2026-09-13 15:45:12.178350

Brand-new table, no existing data to backfill or migrate.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '85dc307735b7'
down_revision: Union[str, Sequence[str], None] = '568c7655f224'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'education',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('institution', sa.String(), nullable=False),
        sa.Column('degree', sa.String(), nullable=False),
        sa.Column('field_of_study', sa.String(), nullable=True),
        sa.Column('start_date', sa.String(), nullable=False),
        sa.Column('end_date', sa.String(), nullable=True),
        sa.Column('location', sa.String(), nullable=True),
        sa.Column('gpa', sa.String(), nullable=True),
        sa.Column('highlights', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['auth_users.id'], name='fk_education_user_id_auth_users'),
    )
    op.create_index('ix_education_user_id', 'education', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_education_user_id', table_name='education')
    op.drop_table('education')
