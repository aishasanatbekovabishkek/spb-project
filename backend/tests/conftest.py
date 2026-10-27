import os
import sys
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_SECRET", "test-secret-at-least-thirty-two-characters")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.provider import get_provider
from main import app


class StubProvider:
    def details(self, source, external_id):
        return {
            "source": source,
            "external_id": external_id,
            "title": "Python Developer",
            "company": "Example",
            "description": "Backend work",
            "url": "https://example.com/vacancy/" + external_id,
            "is_stale": False,
        }

    def search(self, query, page, per_page):
        return {
            "items": [self.details("hh", "123")],
            "page": page,
            "per_page": per_page,
            "total": 1,
            "is_stale": False,
        }


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite://",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, record):
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine)

    def database():
        with sessions() as db:
            yield db

    app.dependency_overrides[get_db] = database
    app.dependency_overrides[get_provider] = StubProvider

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    engine.dispose()


@pytest.fixture
def auth(client):
    credentials = {
        "email": "aisha@example.com",
        "password": "ExamplePassword123",
    }

    assert client.post(
        "/api/v1/auth/register",
        json=credentials,
    ).status_code == 201

    response = client.post(
        "/api/v1/auth/login",
        json=credentials,
    )

    return {
        "Authorization": "Bearer " + response.json()["access_token"]
    }