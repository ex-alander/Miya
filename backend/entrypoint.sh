#!/bin/sh
# Перед стартом приложения применяем миграции (создаём таблицы в БД)
set -e
alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
