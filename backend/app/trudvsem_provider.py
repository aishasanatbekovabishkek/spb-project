import json
import re
import time

import httpx

from app.config import settings
from app.errors import APIError
from app.provider import VacancyProvider


class TrudvsemProvider(VacancyProvider):
    source = "trudvsem"

    def __init__(self, cache=None, client=None, clock=time.time):
        if client is None:
            client = httpx.Client(
                base_url="http://opendata.trudvsem.ru/api",
                timeout=settings.trudvsem_timeout_seconds,
                headers={"User-Agent": "JobApplicationTracker/0.1"},
            )

        super().__init__(
            cache=cache,
            client=client,
            clock=clock,
        )

    @staticmethod
    def item(value, details=False):
        if not isinstance(value, dict):
            raise ValueError("Vacancy must be an object")

        vacancy = value.get("vacancy", value)
        if not isinstance(vacancy, dict):
            raise ValueError("Vacancy data is missing")

        vacancy_id = vacancy.get("id")
        company = vacancy.get("company") or {}
        company_code = company.get("companycode")
        title = vacancy.get("job-name")

        if not isinstance(vacancy_id, str):
            raise ValueError("Vacancy ID is missing")

        if not isinstance(company_code, str):
            raise ValueError("Company code is missing")

        if not isinstance(title, str):
            raise ValueError("Vacancy title is missing")

        result = {
            "source": "trudvsem",
            "external_id": f"{company_code}:{vacancy_id}",
            "title": title,
            "company": company.get("name"),
            "url": vacancy.get("vac_url"),
        }

        if details:
            description_parts = [
                vacancy.get("duty"),
                vacancy.get("requirements"),
            ]
            result["description"] = "\n\n".join(
                part
                for part in description_parts
                if isinstance(part, str) and part.strip()
            )

        return result

    @staticmethod
    def check_response(raw):
        if not isinstance(raw, dict):
            raise APIError(
                502,
                "VACANCY_PROVIDER_BAD_RESPONSE",
                "Invalid vacancy service response",
            )

        if str(raw.get("status")) != "200":
            raise APIError(
                503,
                "VACANCY_PROVIDER_UNAVAILABLE",
                "Vacancy service temporarily unavailable",
            )

    def search(self, query, page, per_page):
        query = " ".join(query.split())
        params = {
            "text": query,
            "offset": page - 1,
            "limit": per_page,
        }

        def transform(raw):
            self.check_response(raw)

            results = raw.get("results") or {}
            vacancies = results.get("vacancies")
            metadata = raw.get("meta") or {}

            if not isinstance(vacancies, list):
                raise ValueError("Vacancy list is missing")

            return {
                "items": [self.item(item) for item in vacancies],
                "page": page,
                "per_page": per_page,
                "total": int(metadata.get("total", len(vacancies))),
            }

        identity = json.dumps(
            ["trudvsem", "search", query, page, per_page],
            ensure_ascii=False,
        )

        return self.cached(
            identity,
            "/v1/vacancies",
            params,
            transform,
        )

    def details(self, source, external_id):
        if source != self.source:
            raise APIError(
                404,
                "VACANCY_NOT_FOUND",
                "Vacancy not found",
            )

        match = re.fullmatch(
            r"([0-9]+):([0-9a-fA-F-]{36})",
            external_id,
        )
        if match is None:
            raise APIError(
                404,
                "VACANCY_NOT_FOUND",
                "Vacancy not found",
            )

        company_code, vacancy_id = match.groups()
        path = f"/v1/vacancies/vacancy/{company_code}/{vacancy_id}"

        def transform(raw):
            self.check_response(raw)

            results = raw.get("results") or {}
            vacancies = results.get("vacancies")

            if not isinstance(vacancies, list) or not vacancies:
                raise APIError(
                    404,
                    "VACANCY_NOT_FOUND",
                    "Vacancy not found",
                )

            return self.item(vacancies[0], details=True)

        identity = json.dumps(
            ["trudvsem", "details", company_code, vacancy_id],
        )

        return self.cached(
            identity,
            path,
            {},
            transform,
        )


trudvsem_provider = TrudvsemProvider()