# ============================================================
# Multi-stage production Dockerfile для FastAPI backend
# Этап 1: установка зависимостей
# Этап 2: минимальный runtime-образ без dev-зависимостей
# ============================================================

# --- Stage 1: Builder ---
FROM python:3.12-slim AS builder

WORKDIR /build

# Устанавливаем зависимости в отдельную директорию для копирования
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Копируем код приложения (нужен для проверки импортов при сборке, опционально)
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini .

# --- Stage 2: Runtime ---
FROM python:3.12-slim AS runtime

# Security: не запускаем от root
RUN groupadd --gid 1000 appgroup \
    && useradd --uid 1000 --gid appgroup --shell /bin/false --create-home appuser

WORKDIR /app

# Копируем только установленные пакеты из builder (без build-артефактов)
COPY --from=builder /install /usr/local

# Копируем код приложения и entrypoint
COPY --from=builder /build/app ./app
COPY --from=builder /build/alembic ./alembic
COPY --from=builder /build/alembic.ini .
COPY entrypoint.sh /app/entrypoint.sh

# Директория для БД/данных (монтируется volume в production)
# sed убирает CRLF (Windows) из entrypoint, чтобы в контейнере работал /bin/sh
RUN mkdir -p /app/data && chown -R appuser:appgroup /app \
    && sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Не храним .pyc и __pycache__ в образе — они не копируются при multi-stage
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

USER appuser

EXPOSE 8000

# Healthcheck для Docker/Kubernetes
HEALTHCHECK --interval=15s --timeout=5s --start-period=45s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')" || exit 1

CMD ["/bin/sh", "/app/entrypoint.sh"]
