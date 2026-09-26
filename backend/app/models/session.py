"""
DiagnosticSession ORM model.
A session is the top-level container for a single AI agent coding run.
All events, diagnoses, verifications and regression tests are scoped to a session.
"""

import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import String, DateTime, Enum as SAEnum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base


class SessionStatus(str):
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"
    INTERRUPTED = "interrupted"


class DiagnosticSession(Base):
    __tablename__ = "diagnostic_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Human-readable label supplied by the agent at session creation
    name: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    # Identifier of the AI agent / tool that created the session
    agent_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, index=True)
    # Repository being worked on
    repository_url: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)
    branch: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    commit_sha: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="active", index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    events: Mapped[List["Event"]] = relationship(  # type: ignore[name-defined]
        "Event", back_populates="session", cascade="all, delete-orphan", lazy="select"
    )
    diagnoses: Mapped[List["Diagnosis"]] = relationship(  # type: ignore[name-defined]
        "Diagnosis",
        back_populates="session",
        cascade="all, delete-orphan",
        lazy="select",
    )
    verifications: Mapped[List["Verification"]] = relationship(  # type: ignore[name-defined]
        "Verification",
        back_populates="session",
        cascade="all, delete-orphan",
        lazy="select",
    )
    regression_tests: Mapped[List["RegressionTest"]] = relationship(  # type: ignore[name-defined]
        "RegressionTest",
        back_populates="session",
        cascade="all, delete-orphan",
        lazy="select",
    )

    def __repr__(self) -> str:
        return f"<DiagnosticSession id={self.id} status={self.status}>"
