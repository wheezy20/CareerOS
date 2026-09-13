"""bridge pipeline to applications

Revision ID: 568c7655f224
Revises: a8572f7dc96c
Create Date: 2026-09-13 05:33:27.910682

Purely additive: every new column is nullable, so no backfill or safety
check is needed — existing rows (manually-created applications, and
generated_cvs rows predating docx_path/pdf_path) are valid as-is.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '568c7655f224'
down_revision: Union[str, Sequence[str], None] = 'a8572f7dc96c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('applications') as batch_op:
        batch_op.add_column(sa.Column('parsed_job_id', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('generated_cv_id', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('cover_letter_text', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('cold_email_text', sa.Text(), nullable=True))
        batch_op.create_foreign_key(
            'fk_applications_parsed_job_id_parsed_jobs', 'parsed_jobs', ['parsed_job_id'], ['id']
        )
        batch_op.create_foreign_key(
            'fk_applications_generated_cv_id_generated_cvs', 'generated_cvs', ['generated_cv_id'], ['id']
        )

    with op.batch_alter_table('generated_cvs') as batch_op:
        batch_op.add_column(sa.Column('docx_path', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('pdf_path', sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('generated_cvs') as batch_op:
        batch_op.drop_column('pdf_path')
        batch_op.drop_column('docx_path')

    with op.batch_alter_table('applications') as batch_op:
        batch_op.drop_constraint('fk_applications_generated_cv_id_generated_cvs', type_='foreignkey')
        batch_op.drop_constraint('fk_applications_parsed_job_id_parsed_jobs', type_='foreignkey')
        batch_op.drop_column('cold_email_text')
        batch_op.drop_column('cover_letter_text')
        batch_op.drop_column('generated_cv_id')
        batch_op.drop_column('parsed_job_id')
