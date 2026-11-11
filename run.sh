#!/bin/bash
set -euo pipefail

echo "=== ШАГ 1: Сборка и запуск сервисов ==="
docker compose -f docker-compose.yml -f docker-compose.frontend.yml up -d --build

echo "=== Ожидание готовности базы данных PostgreSQL ==="
attempts=0
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
docker compose --profile testing run --build --rm tests

echo "=== ШАГ 3: Запуск E2E-тестов (Playwright) ==="

# Функция для восстановления обычного режима (сработает даже при ошибке)
restore_backend() {
    echo "Восстанавливаю обычную конфигурацию бэкенда..."
    docker compose -f docker-compose.yml -f docker-compose.frontend.yml up -d --no-deps --force-recreate backend
    echo "=== ГОТОВО! Все тесты пройдены. Проект доступен на http://localhost:8080 ==="
}

# Говорим скрипту: "что бы ни случилось, выполни restore_backend при выходе"
trap restore_backend EXIT

echo "Временно перезапускаю backend в demo-режиме..."
# Передаем переменную demo напрямую, не трогая .env
VACANCY_PROVIDER_MODE=demo docker compose -f docker-compose.yml -f docker-compose.frontend.yml up -d --no-deps --force-recreate backend

# Запускаем Playwright
docker build -t e2e-tests -f Dockerfile .
NETWORK_NAME=$(docker compose -f docker-compose.yml -f docker-compose.frontend.yml ps -q frontend | xargs docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}')
docker run --rm --network "$NETWORK_NAME" e2e-tests