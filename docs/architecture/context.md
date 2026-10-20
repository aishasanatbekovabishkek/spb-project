
# C4 Level 1 — System Context

## Назначение

Job Application Tracker — веб-приложение для поиска вакансий
и управления процессом трудоустройства.

## Диаграмма контекста

```mermaid
flowchart TB
    User["Соискатель"]

    System["Job Application Tracker
    Поиск вакансий и управление откликами"]

    External["Внешний API вакансий"]

    User <-->|"Поиск вакансий, управление откликами"| System
    System -->|"HTTP API: запрос вакансий"| External

    classDef person fill:#e6effa,stroke:#3976b8,color:#1d4e81
    classDef system fill:#2767a8,stroke:#174978,color:#ffffff
    classDef external fill:#e5efea,stroke:#4a896c,color:#286349

    class User person
    class System system
    class External external
```

## Описание взаимодействий

1. Соискатель использует Job Application Tracker для поиска
   вакансий и отслеживания откликов.
2. Система предоставляет функции сохранения вакансий,
   управления статусами, просмотра истории и статистики.
3. Система обращается к внешнему API вакансий для получения
   информации о предложениях работы.
4. При временной недоступности внешнего API система может
   использовать ранее кэшированные результаты поиска.
