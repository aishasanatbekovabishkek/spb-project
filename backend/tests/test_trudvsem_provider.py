import fakeredis
import httpx
import pytest

from app.errors import APIError
from app.trudvsem_provider import TrudvsemProvider
from app.provider import VacancyProvider


COMPANY_CODE = "1141215003214"
VACANCY_ID = "27c19bd9-b30a-11f0-9d44-8383cd25daf0"
EXTERNAL_ID = f"{COMPANY_CODE}:{VACANCY_ID}"


def make_provider(handler):
    cache = fakeredis.FakeRedis(decode_responses=True)
    client = httpx.Client(
        base_url="http://opendata.trudvsem.ru/api",
        transport=httpx.MockTransport(handler),
    )
    return TrudvsemProvider(cache=cache, client=client)


def vacancy_data():
    return {
        "id": VACANCY_ID,
        "company": {
            "companycode": COMPANY_CODE,
            "name": "Пример компании",
        },
        "job-name": "Программист Python",
        "vac_url": (
            "https://trudvsem.ru/vacancy/card/"
            f"{COMPANY_CODE}/{VACANCY_ID}"
        ),
        "duty": "Разработка приложений",
        "requirements": "Знание Python",
    }


def test_search_converts_response_and_uses_pagination():
    captured = {}

    def handler(request):
        captured["url"] = request.url

        return httpx.Response(
            200,
            json={
                "status": "200",
                "meta": {"total": 25, "limit": 5},
                "results": {
                    "vacancies": [
                        {"vacancy": vacancy_data()},
                    ],
                },
            },
        )

    provider = make_provider(handler)

    try:
        result = provider.search(" python ", page=2, per_page=5)

        assert captured["url"].path == "/api/v1/vacancies"
        assert captured["url"].params["text"] == "python"
        assert captured["url"].params["offset"] == "1"
        assert captured["url"].params["limit"] == "5"

        assert result["page"] == 2
        assert result["per_page"] == 5
        assert result["total"] == 25
        assert result["is_stale"] is False
        assert result["items"][0] == {
            "source": "trudvsem",
            "external_id": EXTERNAL_ID,
            "title": "Программист Python",
            "company": "Пример компании",
            "url": (
                "https://trudvsem.ru/vacancy/card/"
                f"{COMPANY_CODE}/{VACANCY_ID}"
            ),
        }
    finally:
        provider.close()


def test_details_returns_vacancy_description():
    captured = {}

    def handler(request):
        captured["url"] = request.url

        return httpx.Response(
            200,
            json={
                "status": "200",
                "results": {
                    "vacancies": [
                        {"vacancy": vacancy_data()},
                    ],
                },
            },
        )

    provider = make_provider(handler)

    try:
        result = provider.details("trudvsem", EXTERNAL_ID)

        assert captured["url"].path == (
            "/api/v1/vacancies/vacancy/"
            f"{COMPANY_CODE}/{VACANCY_ID}"
        )
        assert result["source"] == "trudvsem"
        assert result["external_id"] == EXTERNAL_ID
        assert result["description"] == (
            "Разработка приложений\n\nЗнание Python"
        )
    finally:
        provider.close()


def test_details_rejects_invalid_external_id():
    provider = make_provider(
        lambda request: httpx.Response(200, json={})
    )

    try:
        with pytest.raises(APIError) as error:
            provider.details("trudvsem", "invalid-id")

        assert error.value.status == 404
    finally:
        provider.close()


def test_hh_and_trudvsem_use_separate_rate_limit_keys():
    cache = fakeredis.FakeRedis(decode_responses=True)

    def handler(request):
        return httpx.Response(200, json={"ok": True})

    hh_client = httpx.Client(
        base_url="https://api.hh.ru",
        transport=httpx.MockTransport(handler),
    )
    trudvsem_client = httpx.Client(
        base_url="https://opendata.trudvsem.ru/api",
        transport=httpx.MockTransport(handler),
    )

    hh_provider = VacancyProvider(cache=cache, client=hh_client)
    trudvsem_provider = TrudvsemProvider(
        cache=cache,
        client=trudvsem_client,
    )

    try:
        assert hh_provider.request("/probe", {}) == {"ok": True}
        assert trudvsem_provider.request("/probe", {}) == {"ok": True}
    finally:
        hh_client.close()
        trudvsem_client.close()
        cache.close()