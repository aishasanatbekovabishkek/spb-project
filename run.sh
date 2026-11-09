#!/bin/bash
echo "Запуск проекта..."
docker compose -f docker-compose.yml -f docker-compose.frontend.yml up -d --build
echo "Проект запущен! Сайт доступен по адресу: http://localhost:8080"