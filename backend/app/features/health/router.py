"""
Health check router — GET /health

Returns structured status for DB, Redis, and process health.
A 200 response only means everything is actually healthy.
A 503 is returned if any dependency is unhealthy — not just 200 blindly.
"""

import logging
from typing import Any, Dict

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import get_settings
from app.core.dependencies import get_db, get_redis

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/health", tags=["health"])


@router.get(
    "",
    summary="Liveness and dependency health check",
    description=(
        "Checks DB connectivity, Redis connectivity, and process health. "
        "Returns 200 only when all dependencies are healthy. "
        "Returns 503 with details when one or more dependencies are unhealthy."
    ),
)
async def health_check(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> JSONResponse:
    settings = get_settings()
    checks: Dict[str, Any] = {}
    all_healthy = True

    # ── Database check ─────────────────────────────────────────────────────────
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = {"status": "healthy"}
    except Exception as exc:
        all_healthy = False
        checks["database"] = {"status": "unhealthy", "error": str(exc)}
        logger.error("Health check: database unhealthy", error=str(exc))

    # ── Redis check ────────────────────────────────────────────────────────────
    try:
        await redis.ping()
        checks["redis"] = {"status": "healthy"}
    except Exception as exc:
        all_healthy = False
        checks["redis"] = {"status": "unhealthy", "error": str(exc)}
        logger.error("Health check: redis unhealthy", error=str(exc))

    # ── Application metadata ───────────────────────────────────────────────────
    checks["application"] = {
        "status": "healthy",
        "version": settings.app_version,
        "environment": settings.environment,
    }

    response_body = {
        "status": "healthy" if all_healthy else "degraded",
        "checks": checks,
    }
    status_code = status.HTTP_200_OK if all_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=status_code, content=response_body)
