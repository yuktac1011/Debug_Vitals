"""
Custom exception hierarchy and centralised exception handlers.

Design rules:
- Every exception carries a stable `code` string for client-side programmatic handling.
- Stack traces are NEVER exposed to clients in production (debug flag controls this).
- HTTP status codes are defined on the exception class, not scattered across handlers.
- Pydantic RequestValidationError and unhandled exceptions are both caught here.
"""

import logging
import structlog
import traceback
from typing import Any, Dict, Optional

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.config.settings import get_settings

logger = structlog.get_logger(__name__)


# ── Base exception ────────────────────────────────────────────────────────────

class AppException(Exception):
    """
    Base class for all application-level exceptions.
    Subclasses set `status_code` and `code` at the class level.
    """
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    code: str = "internal_error"

    def __init__(
        self,
        message: str,
        detail: Optional[Any] = None,
        code: Optional[str] = None,
    ) -> None:
        self.message = message
        self.detail = detail
        if code is not None:
            self.code = code
        super().__init__(message)


# ── Concrete exception types ──────────────────────────────────────────────────

class NotFoundError(AppException):
    status_code = status.HTTP_404_NOT_FOUND
    code = "not_found"


class ValidationError(AppException):
    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT
    code = "validation_error"


class RateLimitError(AppException):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    code = "rate_limit_exceeded"


class ConflictError(AppException):
    status_code = status.HTTP_409_CONFLICT
    code = "conflict"


class ExternalServiceError(AppException):
    """Raised when a downstream service (LLM, Docker, etc.) fails after retries."""
    status_code = status.HTTP_502_BAD_GATEWAY
    code = "external_service_error"


class AuthorizationError(AppException):
    status_code = status.HTTP_403_FORBIDDEN
    code = "forbidden"


class PayloadTooLargeError(AppException):
    status_code = status.HTTP_413_CONTENT_TOO_LARGE
    code = "payload_too_large"


# ── Response builder ──────────────────────────────────────────────────────────

def _error_response(
    request: Request,
    status_code: int,
    code: str,
    message: str,
    detail: Any = None,
    include_trace: bool = False,
    exc: Optional[Exception] = None,
) -> JSONResponse:
    """
    Build a structured error JSON response.
    Stack trace is included only when debug=True (never in production).
    """
    body: Dict[str, Any] = {
        "error": {
            "code": code,
            "message": message,
            "request_id": request.state.request_id
            if hasattr(request.state, "request_id")
            else None,
        }
    }
    if include_trace and exc is not None:
        body["error"]["trace"] = traceback.format_exc()
    if detail is not None and include_trace:
        body["error"]["detail"] = detail

    return JSONResponse(status_code=status_code, content=body)


# ── Handlers ──────────────────────────────────────────────────────────────────

def register_exception_handlers(app: FastAPI) -> None:
    """Register all exception handlers on the FastAPI app instance."""

    @app.exception_handler(AppException)
    async def handle_app_exception(request: Request, exc: AppException) -> JSONResponse:
        settings = get_settings()
        logger.warning(
            "Application exception",
            code=exc.code,
            message=exc.message,
            status_code=exc.status_code,
            path=request.url.path,
        )
        return _error_response(
            request=request,
            status_code=exc.status_code,
            code=exc.code,
            message=exc.message,
            detail=exc.detail,
            include_trace=settings.debug,
            exc=exc,
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        logger.info(
            "Request validation failed",
            path=request.url.path,
            errors=exc.errors(),
        )
        # Pydantic errors are safe to surface — they contain no internal state
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "Request validation failed.",
                    "errors": exc.errors(),
                    "request_id": getattr(request.state, "request_id", None),
                }
            },
        )

    @app.exception_handler(Exception)
    async def handle_unhandled_exception(
        request: Request, exc: Exception
    ) -> JSONResponse:
        settings = get_settings()
        logger.exception(
            "Unhandled exception",
            path=request.url.path,
            exc_info=exc,
        )
        return _error_response(
            request=request,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="internal_error",
            # Generic message — never leak internal details in production
            message="An unexpected error occurred."
            if settings.is_production
            else str(exc),
            include_trace=settings.debug,
            exc=exc,
        )
