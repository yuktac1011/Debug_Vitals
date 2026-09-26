"""
Timeline service — assembles an ordered event timeline for a session.
"""

import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.timeline.repository import TimelineRepository
from app.features.timeline.schemas import TimelineEventItem, TimelineResponse


class TimelineService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = TimelineRepository(db)

    async def get_timeline(
        self,
        session_id: uuid.UUID,
        event_types: Optional[List[str]] = None,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0,
        include_payload: bool = False,
    ) -> TimelineResponse:
        events, total_count = await self._repo.get_timeline_events(
            session_id=session_id,
            event_types=event_types,
            since=since,
            until=until,
            limit=limit,
            offset=offset,
        )

        items = [
            TimelineEventItem(
                id=event.id,
                event_type=event.event_type,
                occurred_at=event.occurred_at,
                ingested_at=event.ingested_at,
                source=event.source,
                severity=event.severity,
                summary=event.summary,
                payload=event.payload if include_payload else None,
            )
            for event in events
        ]

        return TimelineResponse(
            session_id=session_id,
            events=items,
            total_count=total_count,
            has_more=(offset + len(items)) < total_count,
            offset=offset,
            limit=limit,
        )
