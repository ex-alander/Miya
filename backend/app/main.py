from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.router import api_router
from app.core.config import settings
from app.core.logging_config import configure_logging
from app.db.session import engine

# Настраиваем логирование до создания app (JSON в production)
configure_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Старт и корректное завершение по SIGTERM/SIGINT."""
    logger.info("Starting Miya Backend", extra={"environment": settings.ENVIRONMENT})
    yield
    logger.info("Shutting down: closing database pool")
    engine.dispose()


app = FastAPI(title="Miya Backend", version="0.1.0", lifespan=lifespan)

# Rate limiting (SlowAPI): ограничение запросов в минуту с одного IP
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{max(1, settings.RATE_LIMIT_PER_MINUTE)}/minute"],
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS из настроек (cors_origins_list — строка из .env, разбитая по запятым)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/health")
def health():
    """Liveness: сервис запущен."""
    return {"status": "ok"}


@app.get("/ready")
def ready():
    """Readiness: сервис готов принимать трафик (проверка БД)."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        logger.exception("Ready check failed")
        return JSONResponse(
            content={"status": "unhealthy", "detail": str(e)},
            status_code=503,
        )
    return {"status": "ok"}

