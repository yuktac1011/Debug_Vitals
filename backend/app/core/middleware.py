"""
ASGI middleware stack.

RequestIdMiddleware  — injects X-Request-ID on every request/response.
RequestLoggingMiddleware — structured access log with timing.
ErrorBoundaryMiddleware  — catches exceptions that slip past FastAPI handlers
                           and formats them safely.

Middleware runs in registration order (last registered = outermost).
"""

import logging
import time
import uuid
from typing import Awaitable, Callable

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp

from app.config.settings import get_settings

logger = logging.getLogger(__name__)


class RequestIdMiddleware(BaseHTTPMiddleware):
    """
    Generates or propagates an X-Request-ID header on every request.
    The ID is stored on request.state.request_id for use in log records
    and error responses.
    """

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id

        # Bind to structlog context so every log line in this request carries it
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Structured access logging: method, path, status, duration_ms.
    Health-check paths are logged at DEBUG to reduce noise.
    """

    _QUIET_PATHS = {"/health", "/metrics", "/favicon.ico"}

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)

        log_fn = (
            logger.debug
            if request.url.path in self._QUIET_PATHS
            else logger.info
        )
        log_fn(
            "HTTP request",
            method=request.method,
            path=request.url.path,
            query=str(request.url.query) or None,
            status_code=response.status_code,
            duration_ms=duration_ms,
            client=request.client.host if request.client else None,
        )
        return response


class ErrorBoundaryMiddleware:
    """
    Outermost safety net: catches any exception not handled by FastAPI's
    exception handler stack and returns a safe JSON error response.

    This is intentionally implemented as a raw ASGI app (not BaseHTTPMiddleware)
    so it can intercept errors that occur during startup/shutdown events too.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope, receive, send) -> None:  # type: ignore[override]
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        try:
            await self.app(scope, receive, send)
        except Exception as exc:
            settings = get_settings()
            logger.exception("Unhandled ASGI exception", exc_info=exc)
            message = (
                "An unexpected error occurred."
                if settings.is_production
                else str(exc)
            )
            response = JSONResponse(
                status_code=500,
                content={"error": {"code": "internal_error", "message": message}},
            )
            await response(scope, receive, send)
