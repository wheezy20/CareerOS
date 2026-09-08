"""add provider and status to auth_users

Revision ID: e71cf7652e9a
Revises: ad7f3218ef2d
Create Date: 2026-09-08 11:10:24.178185

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e71cf7652e9a'
down_revision: Union[str, Sequence[str], None] = 'ad7f3218ef2d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _check_single_preexisting_owner(bind) -> None:
    """This instance predates multi-provider support, so every existing
    auth_users row should be the single GitHub owner. Refuse to guess a
    backfill value if that assumption doesn't hold — surface the rows
    instead so a human decides.
    """
    auth_users = sa.table("auth_users", sa.column("id", sa.String), sa.column("login", sa.String))
    rows = bind.execute(sa.select(auth_users.c.id, auth_users.c.login)).fetchall()
    if len(rows) > 1:
        raise RuntimeError(
            "Expected at most one pre-existing auth_users row (single-owner, GitHub-only "
            f"instance), found {len(rows)}: {[(row.id, row.login) for row in rows]}. "
            "Review before backfilling provider='github', status='approved'."
        )


def upgrade() -> None:
    bind = op.get_bind()

    # Safety check first, before any DDL.
    _check_single_preexisting_owner(bind)

    # Step 1: add both columns nullable, so an existing row isn't rejected.
    op.add_column('auth_users', sa.Column('provider', sa.String(), nullable=True))
    op.add_column('auth_users', sa.Column('status', sa.String(), nullable=True))

    # Step 2: backfill. Every row that predates this migration is, by the
    # check above, the single GitHub owner — already approved by definition
    # (they were already using this instance).
    bind.execute(sa.text("UPDATE auth_users SET provider = 'github' WHERE provider IS NULL"))
    bind.execute(sa.text("UPDATE auth_users SET status = 'approved' WHERE status IS NULL"))

    # Step 3: now every row has a value — enforce NOT NULL. batch_alter_table
    # is required for this on SQLite; degrades to plain ALTER TABLE on Postgres.
    with op.batch_alter_table('auth_users') as batch_op:
        batch_op.alter_column('provider', existing_type=sa.String(), nullable=False)
        batch_op.alter_column('status', existing_type=sa.String(), nullable=False)


def downgrade() -> None:
    with op.batch_alter_table('auth_users') as batch_op:
        batch_op.drop_column('status')
        batch_op.drop_column('provider')
