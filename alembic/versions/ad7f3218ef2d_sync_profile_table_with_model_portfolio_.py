"""sync profile table with model (portfolio_url, github_url)

Revision ID: ad7f3218ef2d
Revises: 06aab4a530ae
Create Date: 2026-09-05 13:14:53.852500

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'ad7f3218ef2d'
down_revision: Union[str, Sequence[str], None] = '06aab4a530ae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Local careeros.db predates these two columns being added to the Profile
# model (app/models.py) — Base.metadata.create_all() only creates missing
# tables, never alters existing ones, so the table silently drifted out of
# sync. This just brings the local table back in line with the model.


def upgrade() -> None:
    bind = op.get_bind()

    op.add_column('profile', sa.Column('portfolio_url', sa.String(), nullable=True))
    op.add_column('profile', sa.Column('github_url', sa.String(), nullable=True))

    # Matches the model's Python-side default=""
    bind.execute(sa.text("UPDATE profile SET portfolio_url = '' WHERE portfolio_url IS NULL"))
    bind.execute(sa.text("UPDATE profile SET github_url = '' WHERE github_url IS NULL"))

    with op.batch_alter_table('profile') as batch_op:
        batch_op.alter_column('portfolio_url', existing_type=sa.String(), nullable=False)
        batch_op.alter_column('github_url', existing_type=sa.String(), nullable=False)


def downgrade() -> None:
    with op.batch_alter_table('profile') as batch_op:
        batch_op.drop_column('github_url')
        batch_op.drop_column('portfolio_url')
