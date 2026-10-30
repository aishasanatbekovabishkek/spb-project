from pathlib import Path
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret: str = ""
    jwt_expire_minutes: int = Field(default=60, ge=1)
    hh_user_agent: str = "JobApplicationTracker/0.1"
    vacancy_provider_mode: Literal["hh", "demo", "trudvsem"] = "hh"
    provider_timeout_seconds: float = Field(default=3.0, gt=0, le=5)
    trudvsem_timeout_seconds: float = Field(default=15.0, gt=0, le=30)
    provider_min_interval_seconds: float = Field(default=0.2, ge=0.01)
    cache_fresh_seconds: int = Field(default=600, ge=1)
    cache_retention_seconds: int = Field(default=86400, ge=1)
    cors_origins: list[str] = ["http://localhost:5173"]

    @model_validator(mode="after")
    def check_cache_windows(self):
        if self.cache_retention_seconds < self.cache_fresh_seconds:
            raise ValueError("Cache retention must cover the freshness window")
        return self

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        extra="ignore",
    )


settings = Settings()