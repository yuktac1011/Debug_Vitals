"""
Security helpers: CORS policy, input sanitization, rate-limit key builders.

CORS policy is built from settings and never contains wildcards in production.
Sanitization helpers are used at the service boundary, not as a substitute
for Pydantic validation — they're a defence-in-depth layer.
"""

import re
import unicodedata
from typing import Any, Dict

from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import get_settings


# ── CORS ──────────────────────────────────────────────────────────────────────

def get_cors_config() -> Dict[str, Any]:
    """
    Return kwargs suitable for passing directly to CORSMiddleware.
    Origins come from settings; wildcard is rejected at settings validation time.
    """
    settings = get_settings()
    return {
        "allow_origins": settings.allowed_origins_list,
        "allow_credentials": True,
        "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Authorization", "Content-Type", "X-Request-ID"],
        "expose_headers": ["X-Request-ID"],
        "max_age": 600,
    }


# ── Input sanitization ────────────────────────────────────────────────────────

_CONTROL_CHAR_RE = re.compile(
    r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f"  # ASCII control chars (excluding \t \n \r)
    r"\x80-\x9f]"                          # C1 control chars
)

_MAX_STRING_LENGTH = 32_768  # 32 KB hard cap for any single string field


def sanitize_string(value: str, max_length: int = _MAX_STRING_LENGTH) -> str:
    """
    Remove control characters and enforce maximum length.
    Normalise to NFC unicode form.
    Does NOT HTML-escape — that is the client's responsibility.
    """
    if not isinstance(value, str):
        raise TypeError(f"Expected str, got {type(value).__name__}")
    # Unicode normalisation
    value = unicodedata.normalize("NFC", value)
    # Strip dangerous control characters
    value = _CONTROL_CHAR_RE.sub("", value)
    # Hard length cap
    return value[:max_length]


_SAFE_ID_RE = re.compile(r"^[a-zA-Z0-9_\-]{1,128}$")


def sanitize_id(value: str) -> str:
    """
    Validate that an ID field contains only safe characters.
    Raises ValueError on rejection — caller maps to 400.
    """
    if not _SAFE_ID_RE.match(value):
        raise ValueError(
            f"ID contains invalid characters or exceeds 128 chars: {value!r}"
        )
    return value


# ── Rate limit key builders ───────────────────────────────────────────────────

def rate_limit_key(endpoint: str, client_ip: str) -> str:
    """Redis key for sliding-window rate limiting."""
    return f"rl:{endpoint}:{client_ip}"
