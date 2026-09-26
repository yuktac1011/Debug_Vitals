"""
FastAPI application entry point.

Responsibilities of this file:
  - Instantiate the FastAPI app
  - Register middleware (in the correct outside-in order)
  - Register exception handlers
  - Register all feature routers
  - Define the lifespan (startup/shutdown hooks)

NO business logic lives here — this file is pure wiring.
"""

import logging
import structlog
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from app.config.logging_config import configure_logging
from app.config.redis_config import close_redis
from app.config.settings import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.middleware import (
    ErrorBoundaryMiddleware,
    RequestIdMiddleware,
    RequestLoggingMiddleware,
)
from app.core.security import get_cors_config

# Feature routers
from app.features.events.router import router as events_router
from app.features.timeline.router import router as timeline_router
from app.features.correlation.router import router as correlation_router
from app.features.diagnosis.router import router as diagnosis_router
from app.features.verification.router import router as verification_router
from app.features.regression_guard.router import router as regression_guard_router
from app.features.health.router import router as health_router
from app.websockets.handlers import router as ws_router

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan manager.
    Startup: configure logging, validate settings, warm up connections.
    Shutdown: close Redis pool cleanly so in-flight responses complete first.
    """
    settings = get_settings()  # Will raise immediately if required env vars are missing

    configure_logging(
        log_level=settings.log_level,
        environment=settings.environment,
    )
    logger.info(
        "Application starting",
        environment=settings.environment,
        version=settings.app_version,
    )

    # Warm up DB engine (validates connection pool config)
    from app.config.database_config import get_engine
    engine = get_engine()
    logger.info("Database engine initialised", pool_size=settings.db_pool_size)

    # Warm up Redis client
    from app.config.redis_config import get_redis_client
    redis = get_redis_client()
    await redis.ping()
    logger.info("Redis client initialised")

    yield  # Application is running

    # ── Shutdown ──────────────────────────────────────────────────────────────
    logger.info("Application shutting down")
    await close_redis()
    await engine.dispose()
    logger.info("Connections closed — shutdown complete")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "Debug Vitals — AI coding agent diagnostic backend. "
            "Traces agent actions, code changes, and CI results to identify root causes."
        ),
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        openapi_url="/openapi.json" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # ── Exception handlers (registered before middleware) ─────────────────────
    register_exception_handlers(app)

    # ── Middleware (outermost first — ErrorBoundary wraps everything) ─────────
    app.add_middleware(ErrorBoundaryMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(CORSMiddleware, **get_cors_config())

    # ── Routers ───────────────────────────────────────────────────────────────
    prefix = settings.api_prefix  # /api/v1

    app.include_router(health_router, prefix=prefix)
    app.include_router(events_router, prefix=prefix)
    app.include_router(timeline_router, prefix=prefix)
    app.include_router(correlation_router, prefix=prefix)
    app.include_router(diagnosis_router, prefix=prefix)
    app.include_router(verification_router, prefix=prefix)
    app.include_router(regression_guard_router, prefix=prefix)
    app.include_router(ws_router)  # WebSocket routes don't use the REST prefix

    # ── Static frontend ───────────────────────────────────────────────────────
    static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
    if os.path.isdir(static_dir):
        app.mount("/static", StaticFiles(directory=static_dir), name="static")

        @app.get("/", include_in_schema=False)
        async def serve_frontend():
            return FileResponse(os.path.join(static_dir, "index.html"))

    logger.debug("All routers registered")
    return app


app = create_app()
