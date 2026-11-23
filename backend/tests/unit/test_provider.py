import fakeredis
import httpx
import pytest
from redis.exceptions import ConnectionError

from app.errors import APIError
from app.provider import VacancyProvider


def setup_provider():
    state = {
        "time": 10000,
        "calls": 0,
        "status": 200,
        "bad": False,
    }

    def handler(request):
        state["calls"] += 1

        if state.get("timeout"):
            raise httpx.ConnectTimeout("timeout")

        response_data = {
            "items": [
                {
                    "id": "123",
                    "name": "Python",
                    "employer": {"name": "Example"},
                    "alternate_url": "https://example.com",
                }
            ],
            "found": 1,
        }

        return httpx.Response(
            state["status"],
            json={} if state["bad"] else response_data,
        )

    cache = fakeredis.FakeRedis(decode_responses=True)
    client = httpx.Client(
        transport=httpx.MockTransport(handler),
        base_url="https://api.hh.ru",
    )
    provider = VacancyProvider(
        cache,
        client,
        clock=lambda: state["time"],
    )

    return provider, state, cache


def test_cache_fresh_stale_and_expired():
    provider, state, cache = setup_provider()

    result = provider.search("python", 1, 20)
    assert result["is_stale"] is False

    result = provider.search(" python ", 1, 20)
    assert result["is_stale"] is False
    assert state["calls"] == 1

    state["time"] += 601
    state["status"] = 503
    cache.delete("hh:request-budget")

    result = provider.search("python", 1, 20)
    assert result["is_stale"] is True
    assert state["calls"] == 2

    state["time"] += 86400
    cache.delete("hh:request-budget")

    with pytest.raises(APIError) as error:
        provider.search("python", 1, 20)

    assert error.value.status == 503


def test_keys_include_pagination_and_query():
    provider, state, cache = setup_provider()

    searches = [
        ("java", 1, 20),
        ("java", 2, 20),
        ("java", 1, 10),
        ("python", 1, 20),
    ]

    for query, page, per_page in searches:
        cache.delete("hh:request-budget")
        provider.search(query, page, per_page)

    assert state["calls"] == 4


@pytest.mark.parametrize(
    "status,expected",
    [
        (404, 404),
        (429, 429),
        (500, 503),
        (400, 502),
    ],
)
def test_provider_errors(status, expected):
    provider, state, cache = setup_provider()
    state["status"] = status

    with pytest.raises(APIError) as error:
        provider.search("java", 1, 20)

    assert error.value.status == expected
    assert state["calls"] == 1


def test_invalid_response_and_timeout():
    provider, state, cache = setup_provider()
    state["bad"] = True

    with pytest.raises(APIError) as error:
        provider.search("java", 1, 20)

    assert error.value.status == 502

    cache.delete("hh:request-budget")
    state["timeout"] = True

    with pytest.raises(APIError) as error:
        provider.search("java", 1, 20)

    assert error.value.status == 503
    assert state["calls"] == 3


def test_redis_failure_degrades_to_provider():
    provider, state, cache = setup_provider()

    class BrokenCache:
        def get(self, *args, **kwargs):
            raise ConnectionError()

        def set(self, *args, **kwargs):
            raise ConnectionError()

    provider.cache = BrokenCache()
    result = provider.search("java", 1, 20)

    assert result["is_stale"] is False


def test_refresh_lock_uses_old_copy_without_provider_call():
    provider, state, cache = setup_provider()
    provider.search("java", 1, 20)

    state["time"] += 601
    key = next(
        key
        for key in cache.keys("vacancies:v1:*")
        if not key.endswith(":lock")
    )
    cache.set(key + ":lock", "another-worker", ex=15)

    result = provider.search("java", 1, 20)

    assert result["is_stale"] is True
    assert state["calls"] == 1


def test_details_adapter_and_not_found_source():
    captured_requests = []

    def handler(request):
        captured_requests.append(request)
        return httpx.Response(
            200,
            json={
                "id": "123",
                "name": "Backend",
                "employer": None,
                "description": "<p>Work</p>",
                "alternate_url": "https://example.com",
            },
        )

    provider = VacancyProvider(
        fakeredis.FakeRedis(decode_responses=True),
        httpx.Client(
            base_url="https://api.hh.ru",
            transport=httpx.MockTransport(handler),
        ),
    )

    result = provider.details("hh", "123")
    assert result["description"] == "<p>Work</p>"
    assert result["company"] is None
    assert str(captured_requests[0].url) == (
        "https://api.hh.ru/vacancies/123"
    )

    with pytest.raises(APIError) as error:
        provider.details("other", "123")

    assert error.value.status == 404

    with pytest.raises(APIError):
        provider.details("hh", "../123")