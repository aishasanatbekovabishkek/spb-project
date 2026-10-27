from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt

from app.config import settings


VACANCY_REF = {
    "source": "hh",
    "external_id": "123",
}


def test_full_mvp_flow(client, auth):
    assert client.get("/health").json() == {"status": "ok"}

    search = client.get("/api/v1/vacancies?query=python")
    assert search.json()["total"] == 1

    details = client.get("/api/v1/vacancies/hh/123")
    assert details.status_code == 200

    saved = client.post(
        "/api/v1/saved-vacancies",
        json=VACANCY_REF,
        headers=auth,
    )
    assert saved.status_code == 201

    duplicate = client.post(
        "/api/v1/saved-vacancies",
        json=VACANCY_REF,
        headers=auth,
    )
    assert duplicate.status_code == 409

    saved_list = client.get(
        "/api/v1/saved-vacancies",
        headers=auth,
    )
    assert saved_list.json()["total"] == 1

    created = client.post(
        "/api/v1/applications",
        json=VACANCY_REF,
        headers=auth,
    )
    assert created.status_code == 201

    application = created.json()
    assert application["vacancy_id"] == saved.json()["vacancy_id"]

    application_path = "/api/v1/applications/" + application["id"]

    updated = client.patch(
        application_path + "/status",
        headers=auth,
        json={"status": "hr_interview"},
    )
    assert updated.status_code == 200

    client.patch(
        application_path + "/status",
        headers=auth,
        json={"status": "hr_interview"},
    )

    history = client.get(
        application_path + "/history",
        headers=auth,
    ).json()["items"]

    assert [
        (entry["old_status"], entry["new_status"])
        for entry in history
    ] == [
        (None, "applied"),
        ("applied", "hr_interview"),
    ]

    application_info = client.get(
        application_path,
        headers=auth,
    )
    assert application_info.json()["status"] == "hr_interview"

    applied_list = client.get(
        "/api/v1/applications?status=applied",
        headers=auth,
    )
    assert applied_list.json()["total"] == 0

    all_applications = client.get(
        "/api/v1/applications?per_page=1",
        headers=auth,
    )
    assert all_applications.json()["total"] == 1

    statistics = client.get(
        "/api/v1/statistics",
        headers=auth,
    ).json()
    assert statistics["total_applications"] == 1
    assert statistics["total_applications"] == sum(
        statistics["by_status"].values()
    )
    assert statistics["by_status"]["hr_interview"] == 1

    reminder = {
        "application_id": application["id"],
        "message": "Prepare",
        "remind_at": "2026-11-01T10:00:00Z",
    }
    reminder_response = client.post(
        "/api/v1/reminders",
        json=reminder,
        headers=auth,
    )
    assert reminder_response.status_code == 201

    reminders = client.get(
        "/api/v1/reminders",
        headers=auth,
    )
    assert len(reminders.json()["items"]) == 1

    deleted = client.delete(
        "/api/v1/saved-vacancies/" + saved.json()["id"],
        headers=auth,
    )
    assert deleted.status_code == 204
    assert deleted.content == b""

    assert client.get(
        application_path,
        headers=auth,
    ).status_code == 200


def test_user_isolation(client, auth):
    application = client.post(
        "/api/v1/applications",
        json=VACANCY_REF,
        headers=auth,
    ).json()

    saved = client.post(
        "/api/v1/saved-vacancies",
        json=VACANCY_REF,
        headers=auth,
    ).json()

    other_user = {
        "email": "lera@example.com",
        "password": "AnotherPassword123",
    }
    client.post(
        "/api/v1/auth/register",
        json=other_user,
    )

    token = client.post(
        "/api/v1/auth/login",
        json=other_user,
    ).json()["access_token"]

    other_headers = {
        "Authorization": "Bearer " + token,
    }
    application_path = "/api/v1/applications/" + application["id"]

    assert client.get(
        application_path,
        headers=other_headers,
    ).status_code == 404

    assert client.get(
        application_path + "/history",
        headers=other_headers,
    ).status_code == 404

    assert client.patch(
        application_path + "/status",
        json={"status": "offer"},
        headers=other_headers,
    ).status_code == 404

    assert client.delete(
        "/api/v1/saved-vacancies/" + saved["id"],
        headers=other_headers,
    ).status_code == 404

    reminder = {
        "application_id": application["id"],
        "message": "Test",
        "remind_at": "2026-11-01T10:00:00Z",
    }
    assert client.post(
        "/api/v1/reminders",
        headers=other_headers,
        json=reminder,
    ).status_code == 404

    assert client.get(
        "/api/v1/applications",
        headers=other_headers,
    ).json()["total"] == 0

    assert client.get(
        "/api/v1/statistics",
        headers=other_headers,
    ).json()["total_applications"] == 0


def test_auth_and_validation(client, auth):
    assert client.get("/api/v1/applications").status_code == 401

    broken_token = {"Authorization": "Bearer broken"}
    assert client.get(
        "/api/v1/applications",
        headers=broken_token,
    ).status_code == 401

    now = datetime.now(timezone.utc)
    expired_token = jwt.encode(
        {
            "sub": str(uuid4()),
            "iat": now - timedelta(hours=2),
            "exp": now - timedelta(hours=1),
        },
        settings.jwt_secret,
        algorithm="HS256",
    )
    expired_headers = {
        "Authorization": "Bearer " + expired_token,
    }
    assert client.get(
        "/api/v1/applications",
        headers=expired_headers,
    ).status_code == 401

    duplicate_user = {
        "email": "AISHA@example.com",
        "password": "ExamplePassword123",
    }
    assert client.post(
        "/api/v1/auth/register",
        json=duplicate_user,
    ).status_code == 409

    assert client.post(
        "/api/v1/auth/login",
        json=duplicate_user,
    ).status_code == 200

    duplicate_user["password"] = "wrong-password"
    assert client.post(
        "/api/v1/auth/login",
        json=duplicate_user,
    ).status_code == 401

    assert client.get(
        "/api/v1/vacancies?query=%20",
    ).status_code == 422

    assert client.get(
        "/api/v1/vacancies?query=java&per_page=101",
    ).status_code == 422

    invalid_credentials = {
        "email": "bad",
        "password": "short",
    }
    response = client.post(
        "/api/v1/auth/register",
        json=invalid_credentials,
    )
    assert response.status_code == 422
    assert "short" not in response.text

    application = client.post(
        "/api/v1/applications",
        json=VACANCY_REF,
        headers=auth,
    ).json()

    invalid_status = client.patch(
        "/api/v1/applications/"
        + application["id"]
        + "/status",
        json={"status": "unknown"},
        headers=auth,
    )
    assert invalid_status.status_code == 422
    assert invalid_status.json()["error"]["code"] == "INVALID_STATUS"

    assert client.get(
        "/api/v1/applications/invalid",
        headers=auth,
    ).status_code == 422


def test_status_and_history_rollback_together(client, auth):
    from sqlalchemy import event
    from sqlalchemy.exc import SQLAlchemyError

    from app.models import ApplicationStatusHistory

    application = client.post(
        "/api/v1/applications",
        json=VACANCY_REF,
        headers=auth,
    ).json()
    application_path = "/api/v1/applications/" + application["id"]

    def fail_insert(mapper, connection, target):
        raise SQLAlchemyError("simulated history insert failure")

    event.listen(
        ApplicationStatusHistory,
        "before_insert",
        fail_insert,
    )

    try:
        response = client.patch(
            application_path + "/status",
            json={"status": "offer"},
            headers=auth,
        )
        assert response.status_code == 503
    finally:
        event.remove(
            ApplicationStatusHistory,
            "before_insert",
            fail_insert,
        )

    current_application = client.get(
        application_path,
        headers=auth,
    )
    assert current_application.json()["status"] == "applied"

    history = client.get(
        application_path + "/history",
        headers=auth,
    ).json()["items"]
    assert len(history) == 1