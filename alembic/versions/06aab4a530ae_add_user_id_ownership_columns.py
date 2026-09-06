"""add user_id ownership columns

Revision ID: 06aab4a530ae
Revises:
Create Date: 2026-09-05 10:23:32.933921

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '06aab4a530ae'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# The 11 models in scope for multi-user phase 1. Profile (singleton "me" PK,
# needs its own migration strategy) and AuthUser (already user-shaped) are
# deliberately excluded.
TABLES = [
    "roles", "projects", "skills", "courses", "achievements",
    "files", "links", "others", "applications", "templates",
    "parsed_jobs", "generated_cvs",
]


def _single_owner_id(bind) -> str:
    """Find the one existing account to backfill user_id to.

    Refuses to guess if auth_users doesn't hold exactly one row — surfaces
    every row instead so a human decides.
    """
    auth_users = sa.table("auth_users", sa.column("id", sa.String), sa.column("login", sa.String))
    rows = bind.execute(sa.select(auth_users.c.id, auth_users.c.login)).fetchall()
    if len(rows) != 1:
        raise RuntimeError(
            "Expected exactly one auth_users row to backfill user_id from, "
            f"found {len(rows)}: {[(row.id, row.login) for row in rows]}"
        )
    return rows[0].id


def upgrade() -> None:
    bind = op.get_bind()

    # Resolve the backfill target before making any schema changes.
    owner_id = _single_owner_id(bind)

    # Step 1: add the column nullable, so existing rows aren't rejected.
    for table in TABLES:
        op.add_column(table, sa.Column("user_id", sa.String(), nullable=True))

    # Step 2: backfill every existing row to the instance's single current owner.
    for table in TABLES:
        bind.execute(
            sa.text(f"UPDATE {table} SET user_id = :owner_id WHERE user_id IS NULL"),
            {"owner_id": owner_id},
        )

    # Step 3: now every row has a value — enforce NOT NULL and add the FK.
    # batch_alter_table is required for the nullable flip + FK add to work on
    # SQLite (dev); it degrades to plain ALTER TABLE statements on Postgres.
    for table in TABLES:
        with op.batch_alter_table(table) as batch_op:
            batch_op.alter_column("user_id", existing_type=sa.String(), nullable=False)
            batch_op.create_foreign_key(f"fk_{table}_user_id_auth_users", "auth_users", ["user_id"], ["id"])
        op.create_index(f"ix_{table}_user_id", table, ["user_id"], unique=False)


def downgrade() -> None:
    for table in TABLES:
        op.drop_index(f"ix_{table}_user_id", table_name=table)
        with op.batch_alter_table(table) as batch_op:
            batch_op.drop_constraint(f"fk_{table}_user_id_auth_users", type_="foreignkey")
            batch_op.drop_column("user_id")
