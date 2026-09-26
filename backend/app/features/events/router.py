"""
Events router — POST /events and POST /sessions/{session_id}/events.

Router responsibilities:
- Accept and validate request payloads (Pydantic does this automatically)
- Apply rate limiting
- Call into EventService
- Return structured responses

No business logic lives here.
"""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import RateLimiter, get_db
from app.features.events.schemas import EventBatchCreate, EventBatchResponse, EventCreate, EventResponse
from app.features.events.service import EventService

router = APIRouter(prefix="/events", tags=["events"])

_rate_limit = RateLimiter("events")


@router.post(
    "",
    response_model=EventBatchResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Ingest a batch of events",
    description=(
        "Accepts up to 100 events in a single request. "
        "Duplicate events (matched by external_id or content hash) are silently skipped. "
        "Returns the list of accepted event IDs and deduplicated identifiers."
    ),
)
async def ingest_events(
    batch: EventBatchCreate,
    db: AsyncSession = Depends(get_db),
    _rl: None = Depends(_rate_limit),
) -> EventBatchResponse:
    service = EventService(db)
    return await service.ingest_batch(batch)


@router.post(
    "/session/{session_id}",
    response_model=EventBatchResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Ingest events scoped to a specific session",
)
async def ingest_events_for_session(
    session_id: uuid.UUID,
    batch: EventBatchCreate,
    db: AsyncSession = Depends(get_db),
    _rl: None = Depends(_rate_limit),
) -> EventBatchResponse:
    service = EventService(db)
    return await service.ingest_batch(batch, session_id=session_id)
