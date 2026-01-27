from __future__ import annotations

from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database
    DATABASE_URL: str = "sqlite:///./app.db"

    # Security
    SECRET_KEY: str = "change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS: в .env строка через запятую (например "http://localhost:5173,http://127.0.0.1:5173")
    # pydantic-settings для list[str] ждёт JSON; str из env парсим через свойство
    BACKEND_CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Environment and logging
    ENVIRONMENT: Literal["development", "production", "staging"] = "development"
    LOG_LEVEL: str = "INFO"

    # Rate limiting (requests per minute per IP)
    RATE_LIMIT_PER_MINUTE: int = 60

    # AI
    GROQ_API_KEY: str = ""
    DEEPSEEK_API_KEY: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [x.strip() for x in self.BACKEND_CORS_ORIGINS.split(",") if x.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


settings = Settings()

