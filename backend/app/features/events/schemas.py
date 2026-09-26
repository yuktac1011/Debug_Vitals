"""
Event schemas — request/response Pydantic models for the /events endpoint.
All string fields are bounded to prevent oversized payload attacks.
Payload size enforcement happens in the service layer using settings.
"""

import hashlib
import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field, field_validator, model_validator


# ── Supported event types ──────────────────────────────────────────────────────

EventType = Literal[
    "agent_action",
    "git_diff",
    "env_snapshot",
    "test_result",
    "ci_result",
    "dependency",
    "custom",
]

Severity = Literal["debug", "info", "warning", "error", "critical"]


# ── Inbound event ─────────────────────────────────────────────────────────────

class EventCreate(BaseModel):
    """
    Payload accepted at POST /events.
    `session_id` identifies the owning session.
    `external_id` is optional; if provided, it is used for idempotency dedup
    instead of content hash.
    """

    session_id: uuid.UUID
    event_type: EventType
    occurred_at: datetime

    external_id: Optional[str] = Field(
        None, max_length=256, description="Caller-assigned stable ID for deduplication"
    )
    source: Optional[str] = Field(
        None, max_length=128, description="Tool or component that generated the event"
    )
    severity: Optional[Severity] = None
    summary: Optional[str] = Field(None, max_length=1024)
    payload: Optional[Dict[str, Any]] = None

    @field_validator("external_id", "source", "summary", mode="before")
    @classmethod
    def strip_whitespace(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if isinstance(v, str) else v

    def compute_content_hash(self) -> str:
        """
        Deterministic SHA-256 of canonical fields.
        Used for deduplication when external_id is not provided.
        """
        canonical = {
            "session_id": str(self.session_id),
            "event_type": self.event_type,
            "occurred_at": self.occurred_at.isoformat(),
            "external_id": self.external_id,
            "source": self.source,
            "payload": self.payload,
        }
        return hashlib.sha256(
            json.dumps(canonical, sort_keys=True, default=str).encode()
        ).hexdigest()


class EventBatchCreate(BaseModel):
    """Batch ingestion — up to 100 events in a single request."""

    events: List[EventCreate] = Field(..., min_length=1, max_length=100)


# ── Outbound event ─────────────────────────────────────────────────────────────

class EventResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    event_type: str
    occurred_at: datetime
    ingested_at: datetime
    external_id: Optional[str] = None
    source: Optional[str] = None
    severity: Optional[str] = None
    summary: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    content_hash: Optional[str] = None

    model_config = {"from_attributes": True}


class EventBatchResponse(BaseModel):
    accepted: List[uuid.UUID]
    deduplicated: List[str]  # external_ids or content hashes that were skipped
    total_received: int
    total_accepted: int
