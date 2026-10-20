
# C4 Level 2 — Container Diagram

## Назначение

Диаграмма описывает основные контейнеры системы
Job Application Tracker и их взаимодействие.

Архитектурный стиль — модульный монолит.

## Диаграмма

```mermaid
flowchart TB
    User["Соискатель"]

    subgraph System["Job Application Tracker"]
        Frontend["Web Application
        React + TypeScript + Vite"]

        Backend["Backend API
        Python + FastAPI"]

        DB[("PostgreSQL
        Основные данные")]

        Cache[("Redis
        Кэш поиска вакансий")]

        Frontend -->|"REST API / HTTPS / JSON"| Backend
        Backend -->|"SQL"| DB
        Backend -->|"Redis Protocol"| Cache
    end

    External["Внешний API вакансий"]

    User -->|"Работает через браузер"| Frontend
    Backend -->|"HTTP API / JSON"| External

    classDef person fill:#e6effa,stroke:#3976b8,color:#1d4e81
    classDef app fill:#2767a8,stroke:#174978,color:#ffffff
    classDef db fill:#e5efea,stroke:#4a896c,color:#286349
    classDef external fill:#ece7fa,stroke:#8266bb,color:#59428c

    class User person
    class Frontend,Backend app
    class DB,Cache db
    class External external
```

## Описание контейнеров

### Web Application

Технологии: React, TypeScript, Vite.

Обеспечивает пользовательский интерфейс для поиска
вакансий, сохранения вакансий и управления откликами.

Взаимодействует с Backend API через HTTP-запросы.

### Backend API

Технологии: Python, FastAPI.

Реализует бизнес-логику приложения:

- регистрация и авторизация пользователей;
- поиск и фильтрация вакансий;
- сохранение интересующих вакансий;
- управление откликами;
- изменение статусов откликов;
- хранение истории изменений;
- создание напоминаний;
- получение статистики.

### PostgreSQL

Основная реляционная база данных.

Хранит пользователей, вакансии, отклики, историю
изменения статусов и напоминания.

### Redis

Используется для кэширования результатов поиска
вакансий, полученных из внешнего API.

Позволяет уменьшить количество внешних запросов
и продолжить ограниченную работу поиска при
временной недоступности внешнего сервиса.

### Внешний API вакансий

Предоставляет информацию о доступных вакансиях.

Конкретный поставщик API будет зафиксирован
после проверки условий интеграции.

## Архитектурные решения

1. Backend реализован в виде модульного монолита.
2. Frontend взаимодействует только с Backend API.
3. PostgreSQL используется для постоянного хранения.
4. Redis применяется для кэширования внешних данных.
5. При недоступности внешнего API сохранённые отклики,
   статусы и история остаются доступными.
6. Контейнеризация выполняется через Docker Compose.
```
