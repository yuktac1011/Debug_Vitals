"""
Application settings loaded exclusively from environment variables.
The application will refuse to start if any required secret is missing.
Uses Pydantic Settings for strict validation at import time.
"""

from functools import lru_cache
from typing import Literal, List

from pydantic import SecretStr, model_validator
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
    # Stored as plain str to avoid pydantic-settings JSON-parsing List fields.
    # Use the .allowed_origins_list / .allowed_hosts_list properties everywhere.
    allowed_origins: str  # comma-separated, e.g. "http://localhost:3000,http://localhost:5173"
    allowed_hosts: str = "localhost,127.0.0.1"

    # Rate limiting (requests per window)
    rate_limit_events_per_minute: int = 60
    rate_limit_diagnose_per_minute: int = 10
    rate_limit_verify_per_minute: int = 5
    rate_limit_regression_per_minute: int = 5

    # ── LLM — Groq (required for diagnosis; fallback activates on timeout/error) ─
    # Groq exposes an OpenAI-compatible chat completions API at a different base URL.
    groq_api_key: SecretStr
    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_model: str = "openai/gpt-oss-120b"
    groq_timeout_seconds: float = 30.0
    groq_max_retries: int = 3

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

    @model_validator(mode="after")
    def reject_wildcard_origins(self) -> "Settings":
        if "*" in self.allowed_origins_list:
            raise ValueError(
                "Wildcard '*' is not permitted in ALLOWED_ORIGINS. "
                "Specify explicit origins."
            )
        return self

    @model_validator(mode="after")
    def reject_debug_in_production(self) -> "Settings":
        if self.environment == "production" and self.debug:
            raise ValueError(
                "DEBUG must be False in production. "
                "Set ENVIRONMENT=development or DEBUG=false."
            )
        return self

    @property
    def allowed_origins_list(self) -> List[str]:
        """Parsed list of allowed CORS origins."""
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def allowed_hosts_list(self) -> List[str]:
        """Parsed list of allowed hosts."""
        return [h.strip() for h in self.allowed_hosts.split(",") if h.strip()]

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
