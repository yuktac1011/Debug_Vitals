"""
Verification ORM model.
Tracks attempts to reproduce a diagnosed failure in an isolated container.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, DateTime, Text, Integer, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base


class Verification(Base):
    __tablename__ = "verifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    diagnosis_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )

    # pending | running | success | failure | timeout | error | interrupted
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="pending", index=True
    )

    # The Docker image used for the isolated run
    docker_image: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    # Command that was executed inside the container
    command: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Container's exit code
    exit_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Truncated stdout / stderr (stored safely, not executed)
    stdout: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    stderr: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Runtime metadata: resource usage, container ID, etc.
    run_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationship
    session: Mapped["DiagnosticSession"] = relationship(  # type: ignore[name-defined]
        "DiagnosticSession", back_populates="verifications"
    )

    def __repr__(self) -> str:
        return (
            f"<Verification id={self.id} status={self.status} "
            f"session={self.session_id}>"
        )
