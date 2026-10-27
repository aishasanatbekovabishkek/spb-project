from app.errors import APIError


VACANCIES = [
    {
        "source": "demo",
        "external_id": "1001",
        "title": "Python-разработчик",
        "company": "Demo Tech",
        "url": "https://example.com/vacancies/1001",
        "description": "Тестовая вакансия Python-разработчика для демонстрации приложения.",
    },
    {
        "source": "demo",
        "external_id": "1002",
        "title": "Junior Python Developer",
        "company": "Code Lab",
        "url": "https://example.com/vacancies/1002",
        "description": "Начальная позиция для разработчика на Python. Можно откликнуться и отслеживать статус.",
    },
    {
        "source": "demo",
        "external_id": "1003",
        "title": "Backend-разработчик",
        "company": "Sample Systems",
        "url": "https://example.com/vacancies/1003",
        "description": "Тестовая вакансия backend-разработчика. В работе используются Python и FastAPI.",
    },
    {
        "source": "demo",
        "external_id": "1004",
        "title": "QA Automation Engineer",
        "company": "Test Lab",
        "url": "https://example.com/vacancies/1004",
        "description": "Тестовая вакансия инженера по автоматизации тестирования.",
    },
]


class DemoVacancyProvider:
    def search(self, query, page, per_page):
        normalized_query = " ".join(query.split()).casefold()

        matches = [
            vacancy
            for vacancy in VACANCIES
            if normalized_query
            in " ".join(
                (
                    vacancy["title"],
                    vacancy["company"],
                    vacancy["description"],
                )
            ).casefold()
        ]

        start = (page - 1) * per_page
        end = start + per_page
        items = [
            {
                key: vacancy[key]
                for key in ("source", "external_id", "title", "company", "url")
            }
            for vacancy in matches[start:end]
        ]

        return {
            "items": items,
            "page": page,
            "per_page": per_page,
            "total": len(matches),
            "is_stale": False,
        }

    def details(self, source, external_id):
        if source != "demo":
            raise APIError(404, "VACANCY_NOT_FOUND", "Vacancy not found")

        for vacancy in VACANCIES:
            if vacancy["external_id"] == external_id:
                return dict(vacancy)

        raise APIError(404, "VACANCY_NOT_FOUND", "Vacancy not found")