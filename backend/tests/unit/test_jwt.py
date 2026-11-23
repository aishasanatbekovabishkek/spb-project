from datetime import UTC, datetime, timedelta
from unittest.mock import Mock
from uuid import UUID

import jwt
import pytest
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.config import settings
from app.errors import APIError
from app.models import User
from app.security import current_user, make_token


USER_ID = UUID("00000000-0000-4000-8000-000000000001")
TEST_KEY = "unit-tests-only-signing-key-at-least-32-bytes"


@pytest.fixture(autouse=True)
def configure_jwt(monkeypatch):
    monkeypatch.setattr(settings, "jwt_secret", TEST_KEY)
    monkeypatch.setattr(settings, "jwt_expire_minutes", 15)


def bearer(token):
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def test_make_token_contains_user_id_and_configured_lifetime():
    token = make_token(USER_ID)
    claims = jwt.decode(token, TEST_KEY, algorithms=["HS256"])

    assert claims["sub"] == str(USER_ID)
    assert claims["exp"] - claims["iat"] == 15 * 60


def test_valid_token_returns_its_user():
    user = User(id=USER_ID)
    db = Mock(spec=Session)
    db.get.return_value = user

    result = current_user(auth=bearer(make_token(USER_ID)), db=db)

    assert result is user
    db.get.assert_called_once_with(User, USER_ID)


def assert_token_rejected_before_lookup(token):
    db = Mock(spec=Session)

    with pytest.raises(APIError) as error:
        current_user(auth=bearer(token), db=db)

    assert error.value.status == 401
    assert error.value.code == "INVALID_TOKEN"
    db.get.assert_not_called()


def test_malformed_token_is_rejected():
    assert_token_rejected_before_lookup("not-a-jwt")


def test_expired_token_is_rejected():
    now = datetime.now(UTC)
    claims = {
        "sub": str(USER_ID),
        "iat": now - timedelta(hours=2),
        "exp": now - timedelta(hours=1),
    }
    token = jwt.encode(claims, TEST_KEY, algorithm="HS256")

    assert_token_rejected_before_lookup(token)


def test_token_signed_with_another_key_is_rejected(monkeypatch):
    token = make_token(USER_ID)
    monkeypatch.setattr(settings, "jwt_secret", "another-test-key-at-least-32-bytes")

    assert_token_rejected_before_lookup(token)