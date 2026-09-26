"""
Verification service — orchestrates isolated container reruns.
"""

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.features.verification.schemas import VerificationResponse, VerifyRequest
from app.features.verification.subfeatures.container_runner.docker_runner import run_in_container
from app.models.verification import Verification

logger = logging.getLogger(__name__)


class VerificationService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def run_verification(
        self,
        session_id: uuid.UUID,
        request: VerifyRequest,
    ) -> VerificationResponse:
        # Create the verification record in pending state
        verification = Verification(
            session_id=session_id,
            diagnosis_id=request.diagnosis_id,
            status="pending",
            docker_image=request.docker_image,
            command=request.command,
            created_at=datetime.now(timezone.utc),
        )
        self._db.add(verification)
        await self._db.flush()
        await self._db.commit()

        # Mark as running
        verification.status = "running"
        verification.started_at = datetime.now(timezone.utc)
        self._db.add(verification)
        await self._db.commit()

        try:
            result = await run_in_container(
                image=request.docker_image,
                command=request.command,
                environment=request.environment or {},
                run_id=str(verification.id)[:8],
            )

            if result.timed_out:
                verification.status = "timeout"
            elif result.exit_code == 0:
                verification.status = "success"
            else:
                verification.status = "failure"

            verification.exit_code = result.exit_code
            verification.stdout = result.stdout[:65536]  # cap at 64KB
            verification.stderr = result.stderr[:65536]
            verification.run_metadata = result.run_metadata
            verification.completed_at = datetime.now(timezone.utc)

        except ValueError as exc:
            # Invalid image — not an infra error, a user error
            verification.status = "error"
            verification.stderr = str(exc)
            verification.completed_at = datetime.now(timezone.utc)
            logger.warning(
                "Verification rejected — invalid image",
                session_id=str(session_id),
                error=str(exc),
            )

        except Exception as exc:
            verification.status = "error"
            verification.stderr = f"Internal error: {exc}"
            verification.completed_at = datetime.now(timezone.utc)
            logger.exception(
                "Verification run failed",
                session_id=str(session_id),
                error=str(exc),
            )

        self._db.add(verification)
        await self._db.commit()
        await self._db.refresh(verification)

        return VerificationResponse.model_validate(verification)
