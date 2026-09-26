"""
Timeline schemas — request/response models for GET /session/{id}/timeline.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class TimelineEventItem(BaseModel):
    """A single event entry in the timeline view."""

    id: uuid.UUID
    event_type: str
    occurred_at: datetime
    ingested_at: datetime
    source: Optional[str] = None
    severity: Optional[str] = None
    summary: Optional[str] = None
    # Payload is included only when ?include_payload=true
    payload: Optional[Dict[str, Any]] = None

    model_config = {"from_attributes": True}


class TimelineResponse(BaseModel):
    session_id: uuid.UUID
    events: List[TimelineEventItem]
    total_count: int
    has_more: bool
    # Pagination cursors
    offset: int
    limit: int


class TimelineQueryParams(BaseModel):
    """
    Query parameters for timeline retrieval.
    Validated here so the router stays clean.
    """

    event_types: Optional[List[str]] = Field(
        None,
        description="Filter by one or more event types (comma-separated when passed as query param)",
    )
    since: Optional[datetime] = None
    until: Optional[datetime] = None
    limit: int = Field(100, ge=1, le=1000)
    offset: int = Field(0, ge=0)
    include_payload: bool = False
