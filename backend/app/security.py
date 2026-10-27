from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.errors import APIError
from app.models import User

password_hasher = PasswordHash.recommended()
DUMMY_HASH = password_hasher.hash("dummy-password-for-timing")
bearer = HTTPBearer(auto_error=False)


def make_token(user_id):
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": str(user_id),
            "iat": now,
            "exp": now + timedelta(minutes=settings.jwt_expire_minutes),
        },
        settings.jwt_secret,
        algorithm="HS256",
    )


def current_user(
    auth: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
):
    try:
        if auth is None:
            raise ValueError()

        claims = jwt.decode(
            auth.credentials,
            settings.jwt_secret,
            algorithms=["HS256"],
            options={"require": ["sub", "exp", "iat"]},
        )
        user = db.get(User, UUID(claims["sub"]))

        if user is None:
            raise ValueError()

        return user

    except (jwt.PyJWTError, ValueError, TypeError, KeyError):
        raise APIError(401, "INVALID_TOKEN", "Authentication required") from None