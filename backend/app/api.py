from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import APIError
from app.models import (
    Application,
    ApplicationStatusHistory,
    Reminder,
    SavedVacancy,
    User,
    Vacancy,
)
from app.provider import VacancyProvider, get_provider
from app.schemas import (
    Credentials,
    ReminderCreate,
    Status,
    StatusUpdate,
    VacancyRef,
)
from app.security import (
    DUMMY_HASH,
    current_user,
    make_token,
    password_hasher,
)


router = APIRouter(prefix="/api/v1")

DB = Annotated[Session, Depends(get_db)]
Actor = Annotated[User, Depends(current_user)]
Provider = Annotated[VacancyProvider, Depends(get_provider)]
Page = Annotated[int, Query(ge=1)]
Size = Annotated[int, Query(ge=1, le=100)]


def fields(obj, *names):
    return {name: getattr(obj, name) for name in names}


def page_result(db, statement, page, per_page, serialize):
    total = db.scalar(
        select(func.count()).select_from(statement.subquery())
    )
    rows = db.execute(
        statement.limit(per_page).offset((page - 1) * per_page)
    ).all()

    return {
        "items": [serialize(*row) for row in rows],
        "page": page,
        "per_page": per_page,
        "total": total,
    }


def owned_application(db, user, application_id, lock=False):
    statement = select(Application).where(
        Application.id == application_id,
        Application.user_id == user.id,
    )

    if lock:
        statement = statement.with_for_update()

    application_obj = db.scalar(statement)

    if application_obj is None:
        raise APIError(
            404,
            "APPLICATION_NOT_FOUND",
            "Application not found",
        )

    return application_obj


def local_vacancy(db, vacancy_ref, provider):
    statement = select(Vacancy).where(
        Vacancy.source == vacancy_ref.source,
        Vacancy.external_id == vacancy_ref.external_id,
    )
    vacancy = db.scalar(statement)

    if vacancy:
        return vacancy

    data = provider.details(
        vacancy_ref.source,
        vacancy_ref.external_id,
    )

    try:
        with db.begin_nested():
            vacancy = Vacancy(
                **{
                    key: data[key]
                    for key in (
                        "source",
                        "external_id",
                        "title",
                        "company",
                        "url",
                        "description",
                    )
                }
            )
            db.add(vacancy)
            db.flush()
    except IntegrityError:
        vacancy = db.scalar(statement)
        if vacancy is None:
            raise

    return vacancy


@router.post("/auth/register", status_code=201, tags=["auth"])
def register(body: Credentials, db: DB):
    user = User(
        email=str(body.email),
        password_hash=password_hasher.hash(body.password),
    )
    db.add(user)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise APIError(
            409,
            "EMAIL_ALREADY_EXISTS",
            "Email already registered",
        ) from None

    db.refresh(user)
    return fields(user, "id", "email")


@router.post("/auth/login", tags=["auth"])
def login(body: Credentials, db: DB):
    user = db.scalar(
        select(User).where(User.email == str(body.email))
    )
    password_hash = user.password_hash if user else DUMMY_HASH
    password_is_valid = password_hasher.verify(
        body.password,
        password_hash,
    )

    if not user or not password_is_valid:
        raise APIError(
            401,
            "INVALID_CREDENTIALS",
            "Invalid email or password",
        )

    return {
        "access_token": make_token(user.id),
        "token_type": "bearer",
    }


@router.get("/vacancies", tags=["vacancies"])
def search_vacancies(
    provider: Provider,
    query: Annotated[str, Query(min_length=1, max_length=200)],
    page: Page = 1,
    per_page: Size = 20,
):
    if not query.strip():
        raise APIError(
            422,
            "VALIDATION_ERROR",
            "Query must not be empty",
        )

    return provider.search(query, page, per_page)


@router.get(
    "/vacancies/{source}/{external_id}",
    tags=["vacancies"],
)
def vacancy_details(
    source: str,
    external_id: str,
    provider: Provider,
):
    return provider.details(source, external_id)


@router.post(
    "/saved-vacancies",
    status_code=201,
    tags=["saved vacancies"],
)
def save_vacancy(
    body: VacancyRef,
    user: Actor,
    db: DB,
    provider: Provider,
):
    vacancy = local_vacancy(db, body, provider)
    saved = SavedVacancy(
        user_id=user.id,
        vacancy_id=vacancy.id,
    )
    db.add(saved)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise APIError(
            409,
            "VACANCY_ALREADY_SAVED",
            "Vacancy already saved",
        ) from None

    db.refresh(saved)

    return {
        **fields(saved, "id", "vacancy_id", "created_at"),
        **fields(vacancy, "source", "external_id"),
    }


@router.get("/saved-vacancies", tags=["saved vacancies"])
def get_saved_vacancies(
    user: Actor,
    db: DB,
    page: Page = 1,
    per_page: Size = 20,
):
    statement = (
        select(SavedVacancy, Vacancy)
        .join(Vacancy)
        .where(SavedVacancy.user_id == user.id)
        .order_by(
            SavedVacancy.created_at.desc(),
            SavedVacancy.id,
        )
    )

    return page_result(
        db,
        statement,
        page,
        per_page,
        lambda saved, vacancy: {
            **fields(saved, "id", "vacancy_id", "created_at"),
            **fields(
                vacancy,
                "source",
                "external_id",
                "title",
                "company",
                "url",
            ),
        },
    )


@router.delete(
    "/saved-vacancies/{saved_id}",
    status_code=204,
    tags=["saved vacancies"],
)
def delete_saved_vacancy(
    saved_id: UUID,
    user: Actor,
    db: DB,
):
    saved = db.scalar(
        select(SavedVacancy).where(
            SavedVacancy.id == saved_id,
            SavedVacancy.user_id == user.id,
        )
    )

    if saved is None:
        raise APIError(
            404,
            "SAVED_VACANCY_NOT_FOUND",
            "Saved vacancy not found",
        )

    db.delete(saved)
    db.commit()
    return Response(status_code=204)


@router.post(
    "/applications",
    status_code=201,
    tags=["applications"],
)
def create_application(
    body: VacancyRef,
    user: Actor,
    db: DB,
    provider: Provider,
):
    vacancy = local_vacancy(db, body, provider)
    application_obj = Application(
        user_id=user.id,
        vacancy_id=vacancy.id,
        status="applied",
    )
    db.add(application_obj)
    db.flush()

    history_entry = ApplicationStatusHistory(
        application_id=application_obj.id,
        old_status=None,
        new_status="applied",
        changed_at=datetime.now(timezone.utc),
    )
    db.add(history_entry)
    db.commit()
    db.refresh(application_obj)

    return fields(
        application_obj,
        "id",
        "vacancy_id",
        "status",
        "created_at",
        "updated_at",
    )


def application_result(application_obj, vacancy, with_url=False):
    vacancy_fields = [
        "source",
        "external_id",
        "title",
        "company",
    ]

    if with_url:
        vacancy_fields.append("url")

    return {
        **fields(
            application_obj,
            "id",
            "vacancy_id",
            "status",
            "created_at",
            "updated_at",
        ),
        "vacancy": fields(vacancy, *vacancy_fields),
    }


@router.get("/applications", tags=["applications"])
def get_applications(
    user: Actor,
    db: DB,
    page: Page = 1,
    per_page: Size = 20,
    status: Status | None = None,
):
    statement = (
        select(Application, Vacancy)
        .join(Vacancy)
        .where(Application.user_id == user.id)
        .order_by(
            Application.updated_at.desc(),
            Application.id,
        )
    )

    if status is not None:
        statement = statement.where(
            Application.status == status.value
        )

    return page_result(
        db,
        statement,
        page,
        per_page,
        application_result,
    )


@router.get(
    "/applications/{application_id}",
    tags=["applications"],
)
def get_application(
    application_id: UUID,
    user: Actor,
    db: DB,
):
    application_obj = owned_application(
        db,
        user,
        application_id,
    )
    vacancy = db.get(Vacancy, application_obj.vacancy_id)

    return application_result(
        application_obj,
        vacancy,
        with_url=True,
    )


@router.patch(
    "/applications/{application_id}/status",
    tags=["applications"],
)
def update_application_status(
    application_id: UUID,
    body: StatusUpdate,
    user: Actor,
    db: DB,
):
    application_obj = owned_application(
        db,
        user,
        application_id,
        lock=True,
    )

    if application_obj.status != body.status.value:
        history_entry = ApplicationStatusHistory(
            application_id=application_obj.id,
            old_status=application_obj.status,
            new_status=body.status.value,
            changed_at=datetime.now(timezone.utc),
        )
        db.add(history_entry)
        application_obj.status = body.status.value
        application_obj.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(application_obj)

    return fields(
        application_obj,
        "id",
        "status",
        "updated_at",
    )


@router.get(
    "/applications/{application_id}/history",
    tags=["applications"],
)
def get_application_history(
    application_id: UUID,
    user: Actor,
    db: DB,
):
    owned_application(db, user, application_id)

    history_rows = db.scalars(
        select(ApplicationStatusHistory)
        .where(
            ApplicationStatusHistory.application_id == application_id
        )
        .order_by(
            ApplicationStatusHistory.changed_at,
            ApplicationStatusHistory.id,
        )
    )

    return {
        "items": [
            fields(
                entry,
                "id",
                "old_status",
                "new_status",
                "changed_at",
            )
            for entry in history_rows
        ]
    }


@router.post(
    "/reminders",
    status_code=201,
    tags=["reminders"],
)
def create_reminder(
    body: ReminderCreate,
    user: Actor,
    db: DB,
):
    owned_application(
        db,
        user,
        body.application_id,
    )
    reminder = Reminder(
        user_id=user.id,
        **body.model_dump(),
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)

    return fields(
        reminder,
        "id",
        "application_id",
        "message",
        "remind_at",
        "is_completed",
    )


@router.get("/reminders", tags=["reminders"])
def get_reminders(
    user: Actor,
    db: DB,
):
    reminder_rows = db.scalars(
        select(Reminder)
        .where(Reminder.user_id == user.id)
        .order_by(
            Reminder.remind_at,
            Reminder.id,
        )
    )

    return {
        "items": [
            fields(
                reminder,
                "id",
                "application_id",
                "message",
                "remind_at",
                "is_completed",
            )
            for reminder in reminder_rows
        ]
    }


@router.get("/statistics", tags=["statistics"])
def get_statistics(
    user: Actor,
    db: DB,
):
    counts = dict(
        db.execute(
            select(
                Application.status,
                func.count(),
            )
            .where(Application.user_id == user.id)
            .group_by(Application.status)
        ).all()
    )
    by_status = {
        status.value: counts.get(status.value, 0)
        for status in Status
    }

    return {
        "total_applications": sum(by_status.values()),
        "by_status": by_status,
    }