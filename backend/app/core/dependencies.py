"""
Shared FastAPI dependencies injected via Depends().

- get_db:         yields an AsyncSession scoped to the request
- get_redis:      yields the singleton Redis client
- RateLimiter:    callable dependency factory; raises 429 on threshold breach
"""

import logging
import structlog
import time
from typing import AsyncGenerator

from fastapi import Depends, Request
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database_config import get_db_session
from app.config.redis_config import get_redis_client
from app.config.settings import get_settings
from app.core.exceptions import RateLimitError
from app.core.security import rate_limit_key

logger = structlog.get_logger(__name__)


# ── Database ──────────────────────────────────────────────────────────────────

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yields a database session; rolls back on exception."""
    async for session in get_db_session():
        yield session


# ── Redis ─────────────────────────────────────────────────────────────────────

async def get_redis() -> Redis:
    """Returns the application Redis client (no per-request allocation)."""
    return get_redis_client()


# ── Rate limiter ──────────────────────────────────────────────────────────────

class RateLimiter:
    """
    Sliding-window rate limiter backed by Redis sorted sets.

    Usage:
        router.post("/events", dependencies=[Depends(RateLimiter("events"))])

    The window is 60 seconds. The limit for the endpoint comes from settings.
    Raises RateLimitError (429) when the limit is exceeded.

    The sorted set stores timestamps as scores; we evict entries older than
    the window on every check (atomic via pipeline).
    """

    _ENDPOINT_SETTING_MAP = {
        "events": "rate_limit_events_per_minute",
        "diagnose": "rate_limit_diagnose_per_minute",
        "verify": "rate_limit_verify_per_minute",
        "regression": "rate_limit_regression_per_minute",
    }

    def __init__(self, endpoint: str, window_seconds: int = 60) -> None:
        if endpoint not in self._ENDPOINT_SETTING_MAP:
            raise ValueError(f"Unknown rate-limit endpoint: {endpoint!r}")
        self.endpoint = endpoint
        self.window_seconds = window_seconds

    async def __call__(
        self,
        request: Request,
        redis: Redis = Depends(get_redis),
    ) -> None:
        settings = get_settings()
        limit: int = getattr(settings, self._ENDPOINT_SETTING_MAP[self.endpoint])
        client_ip = request.client.host if request.client else "unknown"
        key = rate_limit_key(self.endpoint, client_ip)
        now = time.time()
        window_start = now - self.window_seconds

        async with redis.pipeline(transaction=True) as pipe:
            # Remove entries outside the window, add this request, count remaining
            await pipe.zremrangebyscore(key, "-inf", window_start)
            await pipe.zadd(key, {str(now): now})
            await pipe.zcard(key)
            await pipe.expire(key, self.window_seconds + 5)
            results = await pipe.execute()

        current_count: int = results[2]
        if current_count > limit:
            logger.warning(
                "Rate limit exceeded",
                endpoint=self.endpoint,
                client_ip=client_ip,
                count=current_count,
                limit=limit,
            )
            raise RateLimitError(
                message=f"Rate limit exceeded for endpoint '{self.endpoint}'. "
                f"Maximum {limit} requests per {self.window_seconds}s.",
            )
