"""
RegressionTest ORM model.
Stores generated regression tests and their execution outcomes,
tied to a diagnosis so future regressions can be caught automatically.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, DateTime, Text, Boolean, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base


class RegressionTest(Base):
    __tablename__ = "regression_tests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("diagnostic_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    diagnosis_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )

    # The generated test code
    test_code: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Language/framework the test is written in (e.g. "pytest", "jest")
    test_framework: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    # File path where the test should be placed in the repo
    target_file_path: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)

    # Generation status: pending | generated | failed
    generation_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="pending"
    )

    # Execution status: pending | running | passed | failed | error | timeout | interrupted
    run_status: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    # Whether this test is included in the active regression suite
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Test output from the last run
    run_output: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Metadata about the generation (which root cause it covers, etc.)
    # Named 'meta' in DB to avoid collision with SQLAlchemy's reserved 'metadata' attribute.
    meta: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_run_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationship
    session: Mapped["DiagnosticSession"] = relationship(  # type: ignore[name-defined]
        "DiagnosticSession", back_populates="regression_tests"
    )

    def __repr__(self) -> str:
        return (
            f"<RegressionTest id={self.id} framework={self.test_framework} "
            f"run_status={self.run_status}>"
        )
