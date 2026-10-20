
# REST API Contracts — Job Application Tracker

## 1. Общие положения

Backend: Python + FastAPI

Frontend: React + TypeScript

Формат обмена: JSON

Базовый путь API: `/api/v1`

Авторизация: JWT Bearer Token

Все защищённые эндпоинты требуют заголовок:

`Authorization: Bearer <access_token>`

## 2. Регистрация

### POST /api/v1/auth/register

Запрос:

```json
{
  "email": "user@example.com",
  "password": "ExamplePassword123"
}
```

Ответ: `201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com"
}
```

Ошибки:
- 400 — некорректные данные
- 409 — email уже зарегистрирован
- 422 — ошибка валидации

## 3. Авторизация

### POST /api/v1/auth/login

Запрос:

```json
{
  "email": "user@example.com",
  "password": "ExamplePassword123"
}
```

Ответ: `200 OK`

```json
{
  "access_token": "<jwt_token>",
  "token_type": "bearer"
}
```

Ошибки:
- 401 — неверные учётные данные
- 422 — ошибка валидации

## 4. Поиск вакансий

### GET /api/v1/vacancies

Параметры:
- `query` — поисковый запрос
- `page` — номер страницы, по умолчанию 1
- `per_page` — количество результатов, по умолчанию 20

Пример:

`GET /api/v1/vacancies?query=python&page=1&per_page=20`

Ответ: `200 OK`

```json

{
  "items": [
    {
      "id": "external_123",
      "title": "Python Developer",
      "company": "Example Company",
      "url": "https://example.com/vacancy/123"
    }
  ],
  "page": 1,
  "per_page": 20,
  "total": 1,
  "is_stale": false
}

```

### Кэширование и отказоустойчивость

Поле `is_stale` указывает, являются ли
результаты поиска устаревшими:

- `false` — актуальные результаты из внешнего API
  или свежего Redis-кэша;
- `true` — устаревшие результаты, возвращённые
  при временной недоступности внешнего API.

Если внешний API недоступен и кэш отсутствует,
Backend возвращает `503 Service Unavailable`.

Пример ответа:

```json id="pror0v"
{
  "detail": "Vacancy service temporarily unavailable"
}
```

Frontend должен показывать пользователю уведомление,
если поиск выполняется по устаревшим данным.

При недоступности внешнего API допускается
возврат ранее кэшированных результатов.

## 5. Сохранение вакансий

### POST /api/v1/saved-vacancies

Запрос:

```json
{
  "source": "hh",
  "external_id": "12345"
}
```

Ответ: `201 Created`

```json
{
  "id": "7b2190f1-5a1a-4a3a-9e44-c140d70df318",
  "vacancy_id": "5d1f2cc8-d2e1-4c7d-b74d-4f854274d839",
  "created_at": "2026-10-20T10:00:00Z"
}
```

### GET /api/v1/saved-vacancies

Возвращает сохранённые вакансии текущего
авторизованного пользователя.

### DELETE /api/v1/saved-vacancies/{id}

Удаляет запись из сохранённых вакансий.

Ответ: `204 No Content`

## 6. Создание отклика

### POST /api/v1/applications

Запрос:

```json
{
  "vacancy_id": "5d1f2cc8-d2e1-4c7d-b74d-4f854274d839"
}
```

Ответ: `201 Created`

```json
{
  "id": "ec4c0a10-c7db-4e74-8609-b6b0be222635",
  "vacancy_id": "5d1f2cc8-d2e1-4c7d-b74d-4f854274d839",
  "status": "applied"
}
```

Создание отклика в Job Application Tracker
фиксирует факт отклика в приложении.
Оно не означает автоматическую отправку
резюме работодателю через внешний API.

## 7. Изменение статуса

### PATCH /api/v1/applications/{id}/status

Запрос:

```json
{
  "status": "hr_interview"
}
```

Ответ: `200 OK`

```json
{
  "id": "ec4c0a10-c7db-4e74-8609-b6b0be222635",
  "status": "hr_interview"
}
```

Допустимые статусы:

- applied
- hr_interview
- technical_interview
- test_task
- offer
- rejected

При изменении статуса новая запись
добавляется в историю изменений.

## 8. История статусов

### GET /api/v1/applications/{id}/history

Ответ: `200 OK`

```json
{
  "items": [
    {
      "old_status": "applied",
      "new_status": "hr_interview",
      "changed_at": "2026-10-20T10:00:00Z"
    }
  ]
}
```

## 9. Напоминания

### POST /api/v1/reminders

Запрос:

```json
{
  "application_id": "ec4c0a10-c7db-4e74-8609-b6b0be222635",
  "message": "Подготовиться к собеседованию",
  "remind_at": "2026-10-25T09:00:00Z"
}
```

Ответ: `201 Created`

### GET /api/v1/reminders

Возвращает напоминания пользователя.

## 10. Статистика

### GET /api/v1/statistics

Ответ: `200 OK`

```json
{
  "total_applications": 12,
  "by_status": {
    "applied": 5,
    "hr_interview": 3,
    "technical_interview": 2,
    "offer": 1,
    "rejected": 1
  }
}
```

## 11. Обработка ошибок

Типовой формат ошибки:

```json
{
  "detail": "Resource not found"
}
```

HTTP-статусы:
- 400 — некорректный запрос
- 401 — пользователь не авторизован
- 403 — доступ запрещён
- 404 — ресурс не найден
- 409 — конфликт данных
- 422 — ошибка валидации
- 429 — превышен лимит запросов
- 502 — ошибка внешнего сервиса
- 503 — сервис временно недоступен

## 12. Нефункциональные требования

Предварительные целевые показатели p95:

| Операция | Время отклика |
|---|---|
| Авторизация | до 300 мс |
| Получение откликов | до 300 мс |
| Изменение статуса | до 300 мс |
| Статистика | до 500 мс |
| Поиск из Redis | до 200 мс |
| Поиск через внешний API | до 2000 мс |

Показатели относятся к серверному времени обработки
и подлежат проверке нагрузочными тестами.

## 13. Безопасность

- Все пользовательские операции требуют авторизации,
  кроме регистрации, входа и публичного поиска.
- Пароли не хранятся в открытом виде.
- Пользователь может работать только со своими
  сохранёнными вакансиями, откликами и напоминаниями.
- Backend проверяет входные данные.
- Секреты и параметры подключения хранятся
  в переменных окружения.
```
