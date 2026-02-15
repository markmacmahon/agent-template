import warnings
from typing import Set

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # OpenAPI docs
    OPENAPI_URL: str = "/openapi.json"
    # Path where OpenAPI schema is generated (relative to backend/)
    # Frontend reads from same location (relative to frontend/)
    # Both resolve to: <project-root>/local-shared-data/openapi.json
    OPENAPI_OUTPUT_FILE: str = "../local-shared-data/openapi.json"

    # Database - Sensible defaults for local development
    DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:password@localhost:5432/agents_db"
    )
    TEST_DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:password@localhost:5433/agents_test_db"
    )
    EXPIRE_ON_COMMIT: bool = False

    # User secrets - DEVELOPMENT DEFAULTS (MUST override in production!)
    ACCESS_SECRET_KEY: str = "dev-access-secret-CHANGE-IN-PRODUCTION-min-32-chars"
    RESET_PASSWORD_SECRET_KEY: str = (
        "dev-reset-secret-CHANGE-IN-PRODUCTION-min-32-chars"
    )
    VERIFICATION_SECRET_KEY: str = "dev-verify-secret-CHANGE-IN-PRODUCTION-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_SECONDS: int = 3600

    # Email - Safe defaults for local development (uses MailHog)
    MAIL_USERNAME: str | None = None
    MAIL_PASSWORD: str | None = None
    MAIL_FROM: str = "noreply@localhost"
    MAIL_SERVER: str = "localhost"
    MAIL_PORT: int = 1025
    MAIL_FROM_NAME: str = "ChatBot Application"
    MAIL_STARTTLS: bool = False
    MAIL_SSL_TLS: bool = False
    USE_CREDENTIALS: bool = False
    VALIDATE_CERTS: bool = False
    TEMPLATE_DIR: str = "email_templates"

    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"

    # Webhook header names (override to brand your headers)
    WEBHOOK_HEADER_APP_ID: str = "X-App-Id"
    WEBHOOK_HEADER_THREAD_ID: str = "X-Thread-Id"

    # CORS - Safe default for local development
    CORS_ORIGINS: Set[str] = {"http://localhost:3000", "http://localhost:8000"}

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Warn if using development secrets in production-like environments
        if self.ACCESS_SECRET_KEY.startswith("dev-"):
            warnings.warn(
                "⚠️  WARNING: Using development secret keys! "
                "Set ACCESS_SECRET_KEY, RESET_PASSWORD_SECRET_KEY, and "
                "VERIFICATION_SECRET_KEY in production environment!",
                UserWarning,
                stacklevel=2,
            )


settings = Settings()
