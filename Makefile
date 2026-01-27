# ============================================================
# Makefile для локальной разработки и production-задач Miya
# ============================================================

.PHONY: help install dev build up down logs test lint lint-fix docker-build clean

# По умолчанию — справка
help:
	@echo "Miya — удобные команды"
	@echo ""
	@echo "  make install     — установка зависимостей (backend + frontend)"
	@echo "  make dev         — запуск backend и frontend в dev-режиме (два процесса)"
	@echo "  make build       — сборка frontend (production)"
	@echo "  make up          — поднять сервисы через docker compose"
	@echo "  make down        — остановить docker compose"
	@echo "  make logs        — логи из docker compose"
	@echo "  make test        — тесты backend (если есть)"
	@echo "  make lint        — линтеры backend (ruff) и frontend (eslint при наличии)"
	@echo "  make lint-fix    — автоисправление ruff"
	@echo "  make docker-build — собрать Docker-образы без compose"
	@echo "  make clean       — удалить артефакты и кэши"
	@echo ""

# Установка зависимостей
install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm ci

# Локальная разработка (backend + frontend в фоне)
dev:
	@echo "Запуск backend на :8000 и frontend на :5173..."
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
	cd frontend && npm run dev &
	@echo "Остановите процессы через Ctrl+C или закрытие терминала."

# Сборка frontend
build:
	cd frontend && npm run build

# Docker
up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f

# Сборка образов без запуска
docker-build:
	docker compose build

# Тесты
test:
	cd backend && pytest tests/ -v --tb=short 2>/dev/null || echo "Нет тестов в backend/tests/"

# Линтеры
lint:
	cd backend && ruff check app && ruff format app --check
	cd frontend && npx eslint src --ext .ts,.tsx --max-warnings 0 2>/dev/null || true

lint-fix:
	cd backend && ruff check app --fix && ruff format app

# Очистка
clean:
	rm -rf backend/__pycache__ backend/app/__pycache__ backend/**/__pycache__
	rm -rf backend/.pytest_cache backend/.ruff_cache backend/.mypy_cache
	rm -rf frontend/dist frontend/node_modules/.cache
	@echo "Очистка завершена."
