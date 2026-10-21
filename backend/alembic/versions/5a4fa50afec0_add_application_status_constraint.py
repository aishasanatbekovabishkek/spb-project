"""add application status constraint

Revision ID: 5a4fa50afec0
Revises: ec7d43a7f531
Create Date: 2026-10-20 18:44:18.972436

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5a4fa50afec0'
down_revision: Union[str, Sequence[str], None] = 'ec7d43a7f531'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_applications_status",
        "applications",
        "status IN ("
        "'applied', "
        "'hr_interview', "
        "'technical_interview', "
        "'test_task', "
        "'offer', "
        "'rejected'"
        ")",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_applications_status",
        "applications",
        type_="check",
    )
