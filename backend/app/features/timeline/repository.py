"""
Timeline repository — database queries for building session timelines.
Delegates to EventRepository for event retrieval.
"""

import uuid
from datetime import datetime
from typing import List, Optional, Sequence, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.events.repository import EventRepository
from app.models.event import Event


class TimelineRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._event_repo = EventRepository(session)

    async def get_timeline_events(
        self,
        session_id: uuid.UUID,
        event_types: Optional[List[str]] = None,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[Sequence[Event], int]:
        """
        Return (events, total_count) for a session timeline.
        total_count reflects the full matching set, not the paginated slice,
        so the client can render accurate pagination controls.
        """
        from sqlalchemy import select, func, and_
        from app.models.event import Event as EventModel

        # Count query (no limit/offset)
        count_q = select(func.count(EventModel.id)).where(
            EventModel.session_id == session_id
        )
        if event_types:
            count_q = count_q.where(EventModel.event_type.in_(event_types))
        if since:
            count_q = count_q.where(EventModel.occurred_at >= since)
        if until:
            count_q = count_q.where(EventModel.occurred_at <= until)

        count_result = await self._session.execute(count_q)
        total_count: int = count_result.scalar_one()

        events = await self._event_repo.get_by_session(
            session_id=session_id,
            event_types=event_types,
            since=since,
            until=until,
            limit=limit,
            offset=offset,
        )
        return events, total_count
