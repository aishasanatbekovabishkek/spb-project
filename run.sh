#!/bin/bash
set -euo pipefail

echo "=== ШАГ 1: Сборка и запуск сервисов (БД, накатывание миграций, бэкенд, фронтенд) ==="
docker compose -f docker-compose.yml -f docker-compose.frontend.yml up -d --build

echo "=== Ожидание готовности базы данных PostgreSQL ==="
# Ждем, пока контейнер с БД не станет Healthy (максимум 30 секунд)
attempts=0
# Автоматически определяем имя контейнера БД (не зависит от названия папки)
DB_CONTAINER=$(docker compose -f docker-compose.yml -f docker-compose.frontend.yml ps -q db)

until [ "$(docker inspect -f '{{.State.Health.Status}}' "$DB_CONTAINER" 2>/dev/null)" == "healthy" ]; do
  attempts=$((attempts+1))
  if [ $attempts -ge 15 ]; then
    echo "ОШИБКА: База данных не запустилась за 30 секунд!"
    exit 1
  fi
  echo "Ожидание запуска базы данных... (попытка $attempts из 15)"
  sleep 2
done
echo "База данных готова!"

echo "=== ШАГ 2: Запуск Unit-тестов бэкенда (Pytest) ==="
# Используем отдельный тестовый сервис
docker compose --profile testing run --build --rm tests

echo "=== ШАГ 3: Запуск E2E-тестов (Playwright) ==="
docker build -t e2e-tests -f Dockerfile .
# Автоматически определяем сеть, в которой работает фронтенд
NETWORK_NAME=$(docker compose -f docker-compose.yml -f docker-compose.frontend.yml ps -q frontend | xargs docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}')
docker run --rm --network "$NETWORK_NAME" e2e-tests

echo "=== ГОТОВО! Все тесты пройдены. Проект доступен на http://localhost:8080 ==="