"""
Timeline router — GET /session/{id}/timeline

Router responsibilities:
- Accept and validate query parameters
- Call into TimelineService
- Return paginated timeline response

No business logic lives here.
"""

import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.features.timeline.schemas import TimelineResponse
from app.features.timeline.service import TimelineService

router = APIRouter(prefix="/session", tags=["timeline"])


@router.get(
    "/{session_id}/timeline",
    response_model=TimelineResponse,
    summary="Get the ordered event timeline for a session",
    description=(
        "Returns events for the session, ordered by occurred_at ascending. "
        "Supports filtering by event_type, time range, and pagination. "
        "Set include_payload=true to include full event payloads (larger response)."
    ),
)
async def get_timeline(
    session_id: uuid.UUID,
    event_types: Optional[List[str]] = Query(
        None, alias="event_type", description="Filter by event type(s)"
    ),
    since: Optional[datetime] = Query(None, description="Include events at or after this timestamp"),
    until: Optional[datetime] = Query(None, description="Include events at or before this timestamp"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    include_payload: bool = Query(False, description="Include full event payload in response"),
    db: AsyncSession = Depends(get_db),
) -> TimelineResponse:
    service = TimelineService(db)
    return await service.get_timeline(
        session_id=session_id,
        event_types=event_types,
        since=since,
        until=until,
        limit=limit,
        offset=offset,
        include_payload=include_payload,
    )
