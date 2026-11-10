#!/bin/bash
set -euo pipefail

echo "=== ШАГ 1: Сборка и запуск сервисов (БД, накатывание миграций, бэкенд, фронтенд) ==="
docker compose -f docker-compose.yml -f docker-compose.frontend.yml up -d --build

echo "=== Ожидание готовности базы данных PostgreSQL ==="
# Ждем, пока контейнер с БД не станет Healthy (максимум 30 секунд)
until [ "$(docker inspect -f '{{.State.Health.Status}}' spb-project-db-1 2>/dev/null)" == "healthy" ]; do
  echo "Ожидание запуска базы данных..."
  sleep 2
done
echo "База данных готова!"

echo "=== ШАГ 2: Запуск Unit-тестов бэкенда (Pytest) ==="
# Используем отдельный тестовый сервис, как просила Лера
docker compose --profile testing run --build --rm tests

echo "=== ШАГ 3: Запуск E2E-тестов (Playwright) ==="
docker build -t e2e-tests -f Dockerfile .
docker run --rm --network spb-project_default e2e-tests

echo "=== ГОТОВО! Все тесты пройдены. Проект доступен на http://localhost:8080 ==="