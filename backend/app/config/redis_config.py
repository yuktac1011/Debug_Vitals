"""
Redis client factory with connection pooling.
All Redis interactions in the application go through the client returned here.
Settings (URL, pool size, timeouts) come exclusively from config/settings.py.
"""

from typing import Optional

import redis.asyncio as aioredis
from redis.asyncio import Redis
from redis.asyncio.connection import ConnectionPool

from app.config.settings import get_settings

_pool: Optional[ConnectionPool] = None
_client: Optional[Redis] = None


def get_redis_pool() -> ConnectionPool:
    """Return (or lazily create) the singleton connection pool."""
    global _pool
    if _pool is None:
        settings = get_settings()
        _pool = aioredis.ConnectionPool.from_url(
            settings.redis_url.get_secret_value(),
            max_connections=settings.redis_max_connections,
            socket_timeout=settings.redis_socket_timeout,
            socket_connect_timeout=settings.redis_socket_connect_timeout,
            decode_responses=True,
            health_check_interval=30,
        )
    return _pool


def get_redis_client() -> Redis:
    """Return (or lazily create) the singleton Redis client backed by the pool."""
    global _client
    if _client is None:
        _client = aioredis.Redis(connection_pool=get_redis_pool())
    return _client


async def close_redis() -> None:
    """Close the pool on application shutdown — called from lifespan."""
    global _pool, _client
    if _client is not None:
        await _client.aclose()
        _client = None
    if _pool is not None:
        await _pool.aclose()
        _pool = None
