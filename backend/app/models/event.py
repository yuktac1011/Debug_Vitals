"""
Event ORM model.
An event is the fundamental unit of captured agent activity.

Event types mirror the pipeline stages:
  AGENT_ACTION  — tool call, file edit, shell command, etc.
  GIT_DIFF      — a code diff recorded at a point in time
  ENV_SNAPSHOT  — captured environment state (env vars, installed packages, etc.)
  TEST_RESULT   — outcome of a test run (pass / fail / error)
  CI_RESULT     — CI pipeline outcome
  DEPENDENCY    — dependency install / change event
  CUSTOM        — catch-all for extensibility

The `payload` column stores the raw (sanitized) JSON blob.
`content_hash` enables idempotent ingestion — duplicate events are silently dropped.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    String,
    DateTime,
    Text,
    Index,
    UniqueConstraint,
    ForeignKey,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("diagnostic_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Stable client-provided ID used for idempotency (optional)
    external_id: Mapped[Optional[str]] = mapped_column(
        String(256), nullable=True, index=True
    )
    # SHA-256 of the canonical payload; used for deduplication
    content_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    event_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    source: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    # Timestamp when the event actually occurred in the agent environment
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    # Timestamp when we ingested the event
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Severity / outcome shorthand for quick filtering
    severity: Mapped[Optional[str]] = mapped_column(
        String(32), nullable=True, index=True
    )

    # Full structured payload — JSONB for indexability in Postgres
    payload: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Optional short summary for display in the timeline without loading full payload
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationship back to parent session
    session: Mapped["DiagnosticSession"] = relationship(  # type: ignore[name-defined]
        "DiagnosticSession", back_populates="events"
    )

    __table_args__ = (
        # Idempotency: one (session, content_hash) pair is enough for dedup
        UniqueConstraint("session_id", "content_hash", name="uq_event_session_hash"),
        # Partial index for external_id dedup (only when external_id is set)
        Index(
            "ix_events_session_external_id",
            "session_id",
            "external_id",
            postgresql_where=("external_id IS NOT NULL"),
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<Event id={self.id} type={self.event_type} session={self.session_id}>"
        )
