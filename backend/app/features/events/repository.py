"""
Event repository — all database access for the events feature.
No raw SQL, no business logic; only ORM queries and persistence.
"""

import uuid
from datetime import datetime
from typing import List, Optional, Sequence, Set

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.models.event import Event


class EventRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, event_id: uuid.UUID) -> Optional[Event]:
        result = await self._session.execute(
            select(Event).where(Event.id == event_id)
        )
        return result.scalar_one_or_none()

    async def get_by_session(
        self,
        session_id: uuid.UUID,
        event_types: Optional[List[str]] = None,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
        limit: int = 1000,
        offset: int = 0,
    ) -> Sequence[Event]:
        """
        Retrieve events for a session, optionally filtered by type and time range.
        Ordered by occurred_at ascending for timeline ordering.
        """
        q = select(Event).where(Event.session_id == session_id)
        if event_types:
            q = q.where(Event.event_type.in_(event_types))
        if since:
            q = q.where(Event.occurred_at >= since)
        if until:
            q = q.where(Event.occurred_at <= until)
        q = q.order_by(Event.occurred_at.asc()).limit(limit).offset(offset)
        result = await self._session.execute(q)
        return result.scalars().all()

    async def get_existing_hashes(
        self, session_id: uuid.UUID, hashes: List[str]
    ) -> Set[str]:
        """
        Return the subset of `hashes` that already exist for the given session.
        Used to detect duplicates before insertion.
        """
        result = await self._session.execute(
            select(Event.content_hash).where(
                and_(
                    Event.session_id == session_id,
                    Event.content_hash.in_(hashes),
                )
            )
        )
        return {row for (row,) in result.fetchall()}

    async def get_existing_external_ids(
        self, session_id: uuid.UUID, external_ids: List[str]
    ) -> Set[str]:
        """
        Return the subset of `external_ids` that already exist for the given session.
        """
        result = await self._session.execute(
            select(Event.external_id).where(
                and_(
                    Event.session_id == session_id,
                    Event.external_id.in_(external_ids),
                )
            )
        )
        return {row for (row,) in result.fetchall()}

    async def bulk_insert(self, events: List[Event]) -> List[Event]:
        """
        Persist a list of Event ORM objects.
        Uses add_all; caller must commit after this returns.
        """
        self._session.add_all(events)
        await self._session.flush()
        return events

    async def count_by_session(self, session_id: uuid.UUID) -> int:
        from sqlalchemy import func

        result = await self._session.execute(
            select(func.count(Event.id)).where(Event.session_id == session_id)
        )
        return result.scalar_one()
