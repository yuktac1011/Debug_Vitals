"""
Application settings loaded exclusively from environment variables.
The application will refuse to start if any required secret is missing.
Uses Pydantic Settings for strict validation at import time.
"""

from functools import lru_cache
from typing import Literal, List

from pydantic import AnyHttpUrl, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Environment ────────────────────────────────────────────────────────────
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = False  # controls stack trace exposure; NEVER True in prod

    # ── Application ────────────────────────────────────────────────────────────
    app_name: str = "Debug Vitals"
    app_version: str = "0.1.0"
    api_prefix: str = "/api/v1"

    # ── Database (required) ────────────────────────────────────────────────────
    database_url: SecretStr  # e.g. postgresql+asyncpg://user:pass@host/db
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_pool_timeout: int = 30  # seconds

    # ── Redis (required) ───────────────────────────────────────────────────────
    redis_url: SecretStr  # e.g. redis://user:pass@host:6379/0
    redis_max_connections: int = 50
    redis_socket_timeout: float = 5.0
    redis_socket_connect_timeout: float = 5.0

    # ── Security ───────────────────────────────────────────────────────────────
    secret_key: SecretStr  # used for signing internal tokens / HMAC
    allowed_origins: List[str]  # explicit list; wildcard rejected below
    allowed_hosts: List[str] = ["localhost", "127.0.0.1"]

    # Rate limiting (requests per window)
    rate_limit_events_per_minute: int = 60
    rate_limit_diagnose_per_minute: int = 10
    rate_limit_verify_per_minute: int = 5
    rate_limit_regression_per_minute: int = 5

    # ── LLM (required for diagnosis; fallback activates on timeout/error) ──────
    openai_api_key: SecretStr
    openai_model: str = "gpt-4o-mini"
    openai_timeout_seconds: float = 30.0
    openai_max_retries: int = 3

    # ── Celery / Background jobs ───────────────────────────────────────────────
    celery_broker_url: SecretStr  # usually same Redis URL
    celery_result_backend: SecretStr  # usually same Redis URL
    celery_task_max_retries: int = 3
    celery_task_retry_backoff: int = 60  # seconds

    # ── Docker / Verification sandbox ─────────────────────────────────────────
    docker_execution_timeout: int = 120  # seconds hard cap per container run
    docker_memory_limit: str = "256m"
    docker_cpu_quota: int = 50000  # 50% of one CPU (microseconds per 100ms period)
    docker_network_mode: str = "none"  # no host network access ever

    # ── Logging ────────────────────────────────────────────────────────────────
    log_level: str = "INFO"

    # ── Payload limits ─────────────────────────────────────────────────────────
    max_event_payload_bytes: int = 1_048_576  # 1 MB per event
    max_events_per_session: int = 10_000

    # ── Validators ────────────────────────────────────────────────────────────

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_origins(cls, v):
        """Accept comma-separated string or list."""
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @field_validator("allowed_origins")
    @classmethod
    def reject_wildcard_origins(cls, v: List[str]) -> List[str]:
        if "*" in v:
            raise ValueError(
                "Wildcard '*' is not permitted in ALLOWED_ORIGINS. "
                "Specify explicit origins."
            )
        return v

    @model_validator(mode="after")
    def reject_debug_in_production(self) -> "Settings":
        if self.environment == "production" and self.debug:
            raise ValueError(
                "DEBUG must be False in production. "
                "Set ENVIRONMENT=development or DEBUG=false."
            )
        return self

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def is_development(self) -> bool:
        return self.environment == "development"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the singleton Settings instance. Raises at import if env is invalid."""
    return Settings()  # type: ignore[call-arg]
