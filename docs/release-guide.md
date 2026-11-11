# Руководство по запуску и тестированию проекта JobTracker

Этот документ содержит пошаговую инструкцию по развертыванию проекта и запуску всех видов тестов.

## 1. Предварительные требования
Для запуска проекта на целевой машине должны быть установлены:
- Docker
- Docker Compose
- Bash (или Git Bash для Windows)

## 2. Настройка окружения
Перед первым запуском необходимо создать файл .env в корневой папке проекта. 
Для этого скопируйте шаблон:

    cp .env.example .env

Откройте файл .env и заполните переменные:
- POSTGRES_PASSWORD — пароль для базы данных.
- JWT_SECRET — случайная строка длиной не менее 32 символов.
- VACANCY_PROVIDER_MODE — установите trudvsem для получения реальных вакансий.
- VITE_API_MODE — установите true, чтобы отключить демо-режим на фронтенде.

## 3. Запуск проекта одной командой
Проект полностью оркестрируется с помощью Docker Compose. 
Для сборки и запуска всех сервисов (PostgreSQL, Redis, Backend, Frontend) выполните команду:

    docker compose -f docker-compose.yml -f docker-compose.frontend.yml up -d --build

**Что происходит при запуске:**
1. Поднимается база данных PostgreSQL и Redis.
2. Автоматически накатываются миграции Alembic.
3. Собирается и запускается бэкенд на FastAPI.
4. Собирается фронтенд и раздается через Nginx.

**Проверка статуса и миграций:**
Чтобы убедиться, что все контейнеры работают, выполните:

    docker compose -f docker-compose.yml -f docker-compose.frontend.yml ps

Все сервисы должны иметь статус Up или Healthy. Контейнер с миграциями (migrate) должен завершиться со статусом Exited (0).

**Адреса сервисов:**
- Frontend (сайт): http://localhost:8080
- Backend (API): http://localhost:8001
- Документация API (Swagger): http://localhost:8001/docs

## 4. Запуск тестов

### 4.1. Unit и интеграционные тесты бэкенда (Pytest)
Для запуска тестов бэкенда внутри Docker-контейнера выполните:

    docker compose --profile testing run --build --rm tests

### 4.2. E2E-тесты (Playwright)
Для проверки сквозного сценария используется Playwright.
Убедитесь, что основной проект уже запущен (см. раздел 3), затем выполните:

**Важно для E2E-тестов:** 
Для успешного прохождения E2E-теста (он ищет демо-вакансию «Python-разработчик»), необходимо на время теста переключить приложение в демо-режим. Установите `VACANCY_PROVIDER_MODE=demo` в файле `.env` и перезапустите контейнеры перед запуском Playwright.

    docker build -t e2e-tests -f Dockerfile .
    NETWORK_NAME=$(docker compose -f docker-compose.yml -f docker-compose.frontend.yml ps -q frontend | xargs docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}')
    docker run --rm --network "$NETWORK_NAME" e2e-tests

## 5. Остановка проекта
Чтобы остановить все контейнеры **без удаления данных PostgreSQL**, выполните:

    docker compose -f docker-compose.yml -f docker-compose.frontend.yml stop

(Если вы хотите полностью удалить контейнеры и сети, используйте команду down).

## 6. Известные ограничения проекта
- Поиск вакансий зависит от внешнего API (Trudvsem). При недоступности API или превышении лимитов запросов, поиск может временно не работать.
- В случае падения Redis, система переходит в режим деградации (запросы идут напрямую к API без кэширования).