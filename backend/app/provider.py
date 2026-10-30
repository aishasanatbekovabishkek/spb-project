import hashlib
import json
import logging
import threading
import time
import uuid
from contextlib import contextmanager

import httpx
from redis import Redis
from redis.exceptions import RedisError

from app.config import settings
from app.errors import APIError
from app.demo_provider import DemoVacancyProvider

logger = logging.getLogger(__name__)


class VacancyProvider:
    request_budget_key = "hh:request-budget"

    def __init__(self, cache=None, client=None, clock=time.time):
        self.cache = cache if cache is not None else Redis.from_url(
            settings.redis_url,
            socket_connect_timeout=0.3,
            socket_timeout=0.3,
            decode_responses=True,
        )
        self.client = client if client is not None else httpx.Client(
            base_url="https://api.hh.ru",
            timeout=settings.provider_timeout_seconds,
            headers={"User-Agent": settings.hh_user_agent},
        )
        self.clock = clock
        self.local_lock = threading.Lock()
        self.next_request = 0.0

    def close(self):
        self.client.close()
        self.cache.close()

    def read(self, key):
        try:
            raw = self.cache.get(key)
            if raw:
                value = json.loads(raw)
                age = self.clock() - float(value["stored_at"])
                if (
                    0 <= age <= settings.cache_retention_seconds
                    and isinstance(value["data"], dict)
                ):
                    return value, age
        except (RedisError, ValueError, TypeError, KeyError):
            logger.warning("Vacancy cache unavailable or invalid")
        return None, None

    @contextmanager
    def refresh_lock(self, key):
        token = uuid.uuid4().hex
        try:
            acquired = self.cache.set(
                key + ":lock",
                token,
                nx=True,
                ex=15,
            )
        except RedisError:
            with self.local_lock:
                yield True
            return

        try:
            yield bool(acquired)
        finally:
            if acquired:
                try:
                    self.cache.eval(
                        "if redis.call('get', KEYS[1]) == ARGV[1] then "
                        "return redis.call('del', KEYS[1]) else return 0 end",
                        1,
                        key + ":lock",
                        token,
                    )
                except RedisError:
                    pass

    def request(self, path, params):
        interval = settings.provider_min_interval_seconds

        try:
            allowed = self.cache.set(
                self.request_budget_key,
                "1",
                nx=True,
                px=max(1, int(interval * 1000)),
            )
            if not allowed:
                raise APIError(429, "RATE_LIMITED", "Please retry shortly")
        except RedisError:
            now = time.monotonic()
            if now < self.next_request:
                raise APIError(429, "RATE_LIMITED", "Please retry shortly")
            self.next_request = now + interval

        for attempt in range(2):
            try:
                response = self.client.get(path, params=params)
                break
            except httpx.TransportError:
                if attempt == 1:
                    raise APIError(
                        503,
                        "VACANCY_PROVIDER_UNAVAILABLE",
                        "Vacancy service temporarily unavailable",
                    ) from None

        if response.status_code == 404:
            raise APIError(404, "VACANCY_NOT_FOUND", "Vacancy not found")

        if response.status_code == 429:
            raise APIError(429, "RATE_LIMITED", "Vacancy service rate limit reached")

        if response.status_code >= 500 or response.status_code in (401, 403):
            raise APIError(
                503,
                "VACANCY_PROVIDER_UNAVAILABLE",
                "Vacancy service temporarily unavailable",
            )

        if response.status_code != 200:
            raise APIError(
                502,
                "VACANCY_PROVIDER_BAD_RESPONSE",
                "Invalid vacancy service response",
            )

        try:
            return response.json()
        except ValueError:
            raise APIError(
                502,
                "VACANCY_PROVIDER_BAD_RESPONSE",
                "Invalid vacancy service response",
            ) from None

    @staticmethod
    def item(value, details=False):
        if not isinstance(value["id"], str) or not isinstance(value["name"], str):
            raise ValueError()

        employer = value.get("employer") or {}
        result = {
            "source": "hh",
            "external_id": value["id"],
            "title": value["name"],
            "company": employer.get("name"),
            "url": value.get("alternate_url"),
        }

        if details:
            description = value.get("description", "")
            if not isinstance(description, str):
                raise ValueError()
            result["description"] = description

        return result

    def cached(self, identity, path, params, transform):
        key = "vacancies:v1:" + hashlib.sha256(identity.encode()).hexdigest()
        cached, age = self.read(key)

        if cached is not None and age < settings.cache_fresh_seconds:
            return {**cached["data"], "is_stale": False}

        with self.refresh_lock(key) as acquired:
            if not acquired:
                if cached:
                    return {**cached["data"], "is_stale": True}

                for _ in range(20):
                    time.sleep(0.05)
                    other, other_age = self.read(key)
                    if other:
                        return {
                            **other["data"],
                            "is_stale": other_age >= settings.cache_fresh_seconds,
                        }

                raise APIError(
                    503,
                    "VACANCY_PROVIDER_UNAVAILABLE",
                    "Search refresh in progress",
                )

            other, other_age = self.read(key)
            if other and other_age < settings.cache_fresh_seconds:
                return {**other["data"], "is_stale": False}

            try:
                raw = self.request(path, params)
                try:
                    data = transform(raw)
                except (KeyError, TypeError, ValueError, AttributeError):
                    raise APIError(
                        502,
                        "VACANCY_PROVIDER_BAD_RESPONSE",
                        "Invalid vacancy service response",
                    ) from None
            except APIError as exc:
                if cached and exc.status in (429, 502, 503):
                    return {**cached["data"], "is_stale": True}
                raise

            try:
                self.cache.set(
                    key,
                    json.dumps({"stored_at": self.clock(), "data": data}),
                    ex=settings.cache_retention_seconds,
                )
            except RedisError:
                logger.warning("Vacancy result could not be cached")

            return {**data, "is_stale": False}

    def search(self, query, page, per_page):
        query = " ".join(query.split())
        params = {
            "text": query,
            "page": page - 1,
            "per_page": per_page,
        }

        def transform(raw):
            if not isinstance(raw["items"], list) or type(raw["found"]) is not int:
                raise ValueError()

            return {
                "items": [self.item(item) for item in raw["items"]],
                "page": page,
                "per_page": per_page,
                "total": raw["found"],
            }

        identity = json.dumps(
            ["hh", "search", query, page, per_page],
            ensure_ascii=False,
        )
        return self.cached(identity, "/vacancies", params, transform)

    def details(self, source, external_id):
        if source != "hh" or not external_id.isascii() or not external_id.isdigit():
            raise APIError(404, "VACANCY_NOT_FOUND", "Vacancy not found")

        identity = json.dumps(["hh", "detail", external_id])
        return self.cached(
            identity,
            "/vacancies/" + external_id,
            {},
            lambda raw: self.item(raw, True),
        )


provider = VacancyProvider()
demo_provider = DemoVacancyProvider()


def get_provider():
    if settings.vacancy_provider_mode == "demo":
        return demo_provider

    if settings.vacancy_provider_mode == "trudvsem":
        from app.trudvsem_provider import trudvsem_provider

        return trudvsem_provider

    return provider