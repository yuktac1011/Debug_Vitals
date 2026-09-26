"""
Event service — business logic for event ingestion.

Responsibilities:
- Validate session existence
- Enforce per-session event cap
- Deduplicate events (by external_id or content hash)
- Route each event to the appropriate normaliser (agent_activity, git_watcher,
  env_scanner) to enrich the payload before persistence
- Persist and return results

No database queries are made directly — all DB access goes through EventRepository.
"""

import logging
import uuid
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import get_settings
from app.core.exceptions import NotFoundError, PayloadTooLargeError, ValidationError
from app.features.events.repository import EventRepository
from app.features.events.schemas import EventBatchCreate, EventBatchResponse, EventCreate, EventResponse
from app.features.events.subfeatures.agent_activity.capture import normalise_agent_action
from app.features.events.subfeatures.git_watcher.diff_parser import normalise_git_diff
from app.features.events.subfeatures.env_scanner.scanner import normalise_env_snapshot
from app.models.event import Event

logger = logging.getLogger(__name__)

# Map event_type → normaliser function
_NORMALISERS = {
    "agent_action": normalise_agent_action,
    "git_diff": normalise_git_diff,
    "env_snapshot": normalise_env_snapshot,
}


class EventService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._repo = EventRepository(db)
        self._settings = get_settings()

    async def ingest_batch(
        self,
        batch: EventBatchCreate,
        session_id: Optional[uuid.UUID] = None,
    ) -> EventBatchResponse:
        """
        Ingest a batch of events.
        Returns counts of accepted vs deduplicated events.
        """
        # Verify all events belong to the same session (or the path-level session_id)
        session_ids = {e.session_id for e in batch.events}
        if session_id is not None and session_ids != {session_id}:
            raise ValidationError(
                "All events in a batch must belong to the session specified in the URL."
            )

        # We only support single-session batches for simplicity
        if len(session_ids) > 1:
            raise ValidationError(
                "Batch events must all belong to the same session."
            )

        target_session_id = session_id or batch.events[0].session_id

        # Enforce per-session cap
        current_count = await self._repo.count_by_session(target_session_id)
        if current_count + len(batch.events) > self._settings.max_events_per_session:
            raise PayloadTooLargeError(
                f"Session {target_session_id} would exceed the maximum of "
                f"{self._settings.max_events_per_session} events."
            )

        # Build dedup sets
        hashes = [e.compute_content_hash() for e in batch.events]
        external_ids = [e.external_id for e in batch.events if e.external_id]

        existing_hashes = await self._repo.get_existing_hashes(
            target_session_id, hashes
        )
        existing_external_ids = await self._repo.get_existing_external_ids(
            target_session_id, external_ids
        )

        accepted_ids: List[uuid.UUID] = []
        deduplicated: List[str] = []
        to_persist: List[Event] = []

        for event_create, content_hash in zip(batch.events, hashes):
            # Deduplication: prefer external_id, fall back to content hash
            if event_create.external_id and event_create.external_id in existing_external_ids:
                deduplicated.append(event_create.external_id)
                logger.debug(
                    "Skipping duplicate event",
                    external_id=event_create.external_id,
                    session_id=str(target_session_id),
                )
                continue

            if content_hash in existing_hashes:
                deduplicated.append(content_hash)
                logger.debug(
                    "Skipping duplicate event by hash",
                    content_hash=content_hash,
                    session_id=str(target_session_id),
                )
                continue

            # Normalise payload through the appropriate subfeature
            normalised_payload = self._normalise(event_create)

            orm_event = Event(
                session_id=target_session_id,
                external_id=event_create.external_id,
                content_hash=content_hash,
                event_type=event_create.event_type,
                source=event_create.source,
                occurred_at=event_create.occurred_at,
                severity=event_create.severity,
                summary=event_create.summary,
                payload=normalised_payload,
            )
            to_persist.append(orm_event)

            # Track so subsequent items in same batch don't re-insert
            existing_hashes.add(content_hash)
            if event_create.external_id:
                existing_external_ids.add(event_create.external_id)

        if to_persist:
            persisted = await self._repo.bulk_insert(to_persist)
            await self._db.commit()
            accepted_ids = [e.id for e in persisted]
            logger.info(
                "Events ingested",
                count=len(persisted),
                session_id=str(target_session_id),
            )

        return EventBatchResponse(
            accepted=accepted_ids,
            deduplicated=deduplicated,
            total_received=len(batch.events),
            total_accepted=len(accepted_ids),
        )

    def _normalise(self, event: EventCreate) -> Optional[dict]:
        """
        Route the event payload to the appropriate normaliser.
        Falls back to the raw payload if no normaliser exists for the type.
        """
        normaliser = _NORMALISERS.get(event.event_type)
        if normaliser is None:
            return event.payload
        try:
            return normaliser(event.payload or {})
        except Exception as exc:
            logger.warning(
                "Normaliser failed, storing raw payload",
                event_type=event.event_type,
                error=str(exc),
            )
            return event.payload
