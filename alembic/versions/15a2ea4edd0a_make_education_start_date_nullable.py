"""make education start_date nullable

Revision ID: 15a2ea4edd0a
Revises: 85dc307735b7
Create Date: 2026-09-13 17:00:45.261116

Purely relaxes a NOT NULL constraint — every existing row already has a
start_date value, so no backfill is needed. Note the downgrade re-imposes
NOT NULL and will fail if any row has since been saved with a null
start_date; that's expected — there's no sensible value to backfill.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '15a2ea4edd0a'
down_revision: Union[str, Sequence[str], None] = '85dc307735b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('education') as batch_op:
        batch_op.alter_column('start_date', existing_type=sa.String(), nullable=True)


def downgrade() -> None:
    with op.batch_alter_table('education') as batch_op:
        batch_op.alter_column('start_date', existing_type=sa.String(), nullable=False)
