#!/bin/bash

echo "=== ШАГ 1: Сборка и запуск сервисов (БД, накатывание миграций, бэкенд, фронтенд) ==="
docker compose -f docker-compose.yml -f docker-compose.frontend.yml up -d --build

echo "=== Ожидание запуска БД и накатывания миграций (15 секунд) ==="
sleep 15

echo "=== ШАГ 2: Запуск Unit-тестов бэкенда (Pytest) ==="
docker compose exec backend pytest

echo "=== ШАГ 3: Запуск E2E-тестов (Playwright) ==="
docker build -t e2e-tests -f Dockerfile .
docker run --rm --network spb-project_default e2e-tests

echo "=== ГОТОВО! Все тесты пройдены. Проект доступен на http://localhost:8080 ==="