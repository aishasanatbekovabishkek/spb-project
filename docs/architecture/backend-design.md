# Backend architecture

## Назначение

В этом документе описана архитектура backend для Job Application Tracker. Backend реализуется как единое приложение FastAPI, которое взаимодействует с PostgreSQL, Redis и внешним API вакансий.

Это проектное описание для MVP. Оно не означает, что производительность системы уже проверена нагрузочными тестами.

## Компоненты

```mermaid
flowchart LR
    User["Пользователь"] --> Browser["React"]
    Browser -->|"REST / JSON"| API["FastAPI"]
    API -->|"SQL"| DB[("PostgreSQL")]
    API -->|"Кэш"| Redis[("Redis")]
    API -->|"HTTPS / JSON"| Provider["API вакансий"]