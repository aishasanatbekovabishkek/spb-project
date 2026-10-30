from enum import StrEnum
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, EmailStr, Field, field_validator


class Credentials(BaseModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value):
        return str(value).lower()


class VacancyRef(BaseModel):
    source: str = Field(pattern=r"^(hh|demo|trudvsem)$")
    external_id: str = Field(
        min_length=1,
        max_length=255,
        pattern=r"^[A-Za-z0-9:-]+$",
    )


class Status(StrEnum):
    applied = "applied"
    hr_interview = "hr_interview"
    technical_interview = "technical_interview"
    test_task = "test_task"
    offer = "offer"
    rejected = "rejected"


class StatusUpdate(BaseModel):
    status: Status


class ReminderCreate(BaseModel):
    application_id: UUID
    message: str = Field(min_length=1, max_length=2000)
    remind_at: AwareDatetime