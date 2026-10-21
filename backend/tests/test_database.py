import uuid

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import engine
from app.models import Vacancy, User, SavedVacancy, Application


def test_duplicate_vacancy_is_rejected():
    """PostgreSQL must reject duplicate external vacancies."""

    with Session(engine) as session:
        external_id = str(uuid.uuid4())

        first = Vacancy(
            source="hh",
            external_id=external_id,
            title="Python Developer",
        )
        second = Vacancy(
            source="hh",
            external_id=external_id,
            title="Python Developer",
        )

        session.add(first)
        session.flush()

        session.add(second)

        with pytest.raises(IntegrityError):
            session.flush()

        session.rollback()



def test_duplicate_saved_vacancy_is_rejected():
    """A user cannot save the same vacancy twice."""

    with Session(engine) as session:
        user = User(
            email=f"{uuid.uuid4()}@example.com",
            password_hash="test_hash",
        )
        vacancy = Vacancy(
            source="hh",
            external_id=str(uuid.uuid4()),
            title="Backend Developer",
        )

        session.add_all([user, vacancy])
        session.flush()

        first = SavedVacancy(
            user_id=user.id,
            vacancy_id=vacancy.id,
        )
        second = SavedVacancy(
            user_id=user.id,
            vacancy_id=vacancy.id,
        )

        session.add(first)
        session.flush()
        session.add(second)

        with pytest.raises(IntegrityError):
            session.flush()

        session.rollback()


def test_invalid_application_status_is_rejected():
    """PostgreSQL must reject invalid application statuses."""

    with Session(engine) as session:
        user = User(
            email=f"{uuid.uuid4()}@example.com",
            password_hash="test_hash",
        )
        vacancy = Vacancy(
            source="hh",
            external_id=str(uuid.uuid4()),
            title="Python Developer",
        )

        session.add_all([user, vacancy])
        session.flush()

        application = Application(
            user_id=user.id,
            vacancy_id=vacancy.id,
            status="unknown_status",
        )

        session.add(application)

        with pytest.raises(IntegrityError):
            session.flush()

        session.rollback()
