"""add user_id to profile

Revision ID: a8572f7dc96c
Revises: e71cf7652e9a
Create Date: 2026-09-08 16:32:23.412103

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a8572f7dc96c'
down_revision: Union[str, Sequence[str], None] = 'e71cf7652e9a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # Safety check first, before any DDL. This instance predates per-user
    # profiles, so there should be at most one pre-existing row — refuse to
    # guess a backfill if that assumption doesn't hold.
    profile_table = sa.table("profile", sa.column("id", sa.String))
    profile_rows = bind.execute(sa.select(profile_table.c.id)).fetchall()
    if len(profile_rows) > 1:
        raise RuntimeError(
            f"Expected at most one pre-existing profile row, found {len(profile_rows)}: "
            f"{[row.id for row in profile_rows]}. Review before backfilling user_id."
        )

    # Step 1: add nullable, so an existing row isn't rejected.
    op.add_column('profile', sa.Column('user_id', sa.String(), nullable=True))

    # Step 2: backfill, only if there's actually a row to backfill.
    if profile_rows:
        auth_users = sa.table("auth_users", sa.column("id", sa.String), sa.column("login", sa.String))
        owner_rows = bind.execute(sa.select(auth_users.c.id, auth_users.c.login)).fetchall()
        if len(owner_rows) != 1:
            raise RuntimeError(
                "Expected exactly one auth_users row to backfill profile.user_id from, "
                f"found {len(owner_rows)}: {[(row.id, row.login) for row in owner_rows]}"
            )
        owner_id = owner_rows[0].id
        bind.execute(sa.text("UPDATE profile SET user_id = :owner_id WHERE user_id IS NULL"), {"owner_id": owner_id})

    # Step 3: enforce NOT NULL + uniqueness (one profile per user) + the FK.
    # batch_alter_table is required for this on SQLite; degrades to plain
    # ALTER TABLE statements on Postgres.
    with op.batch_alter_table('profile') as batch_op:
        batch_op.alter_column('user_id', existing_type=sa.String(), nullable=False)
        batch_op.create_unique_constraint('uq_profile_user_id', ['user_id'])
        batch_op.create_foreign_key('fk_profile_user_id_auth_users', 'auth_users', ['user_id'], ['id'])


def downgrade() -> None:
    with op.batch_alter_table('profile') as batch_op:
        batch_op.drop_constraint('fk_profile_user_id_auth_users', type_='foreignkey')
        batch_op.drop_constraint('uq_profile_user_id', type_='unique')
        batch_op.drop_column('user_id')
