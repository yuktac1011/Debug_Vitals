"""
Async container orchestration tasks — runs verification and regression test jobs.

Reliability guarantees mirror reasoning_tasks.py:
  - max_retries limited (no infinite loops)
  - exponential backoff
  - dead-letter on exhaustion
  - graceful shutdown: marks in-flight jobs as "interrupted" on SIGTERM
"""

import asyncio
import logging
import uuid

from celery import Task
from celery.exceptions import MaxRetriesExceededError
from celery.signals import worker_shutdown

from app.workers.celery_app import celery_app
from app.config.settings import get_settings

logger = logging.getLogger(__name__)

# Track in-flight verification IDs so we can mark them interrupted on shutdown
_in_flight_verifications: set = set()


@worker_shutdown.connect
def handle_worker_shutdown(sender, **kwargs):
    """
    On graceful shutdown, mark any in-flight verifications as interrupted
    so they are not silently left in 'running' state.
    """
    if not _in_flight_verifications:
        return
    logger.warning(
        "Worker shutting down with in-flight verifications",
        count=len(_in_flight_verifications),
    )

    async def _mark_interrupted():
        from app.config.database_config import get_async_session_factory
        from app.models.verification import Verification
        from sqlalchemy import select

        factory = get_async_session_factory()
        async with factory() as db:
            for verification_id in list(_in_flight_verifications):
                result = await db.execute(
                    select(Verification).where(
                        Verification.id == uuid.UUID(verification_id)
                    )
                )
                v = result.scalar_one_or_none()
                if v and v.status == "running":
                    v.status = "interrupted"
                    db.add(v)
            await db.commit()

    loop = asyncio.new_event_loop()
    try:
        loop.run_until_complete(_mark_interrupted())
    finally:
        loop.close()


class VerificationTask(Task):
    abstract = True

    def run_async(self, coro):
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()


@celery_app.task(
    bind=True,
    base=VerificationTask,
    name="app.workers.tasks.verification_tasks.run_verification_async",
    queue="verification",
    acks_late=True,
)
def run_verification_async(
    self: VerificationTask,
    session_id: str,
    docker_image: str,
    command: str,
    environment: dict = None,
    diagnosis_id: str = None,
) -> dict:
    """
    Async verification task — runs a container job outside the request cycle.
    """
    settings = get_settings()
    self.max_retries = settings.celery_task_max_retries

    logger.info(
        "Verification task started",
        session_id=session_id,
        task_id=self.request.id,
    )

    async def _run():
        from app.config.database_config import get_async_session_factory
        from app.features.verification.service import VerificationService
        from app.features.verification.schemas import VerifyRequest
        import uuid as _uuid

        factory = get_async_session_factory()
        async with factory() as db:
            service = VerificationService(db)
            request = VerifyRequest(
                docker_image=docker_image,
                command=command,
                environment=environment or {},
                diagnosis_id=_uuid.UUID(diagnosis_id) if diagnosis_id else None,
            )
            result = await service.run_verification(
                session_id=_uuid.UUID(session_id),
                request=request,
            )
            _in_flight_verifications.discard(str(result.id))
            return {
                "verification_id": str(result.id),
                "status": result.status,
                "exit_code": result.exit_code,
            }

    try:
        return self.run_async(_run())
    except Exception as exc:
        logger.exception(
            "Verification task failed",
            session_id=session_id,
            task_id=self.request.id,
            error=str(exc),
        )
        try:
            raise self.retry(
                exc=exc,
                countdown=settings.celery_task_retry_backoff * (2 ** self.request.retries),
            )
        except MaxRetriesExceededError:
            logger.error(
                "Verification task exceeded max retries — sending to dead letter",
                session_id=session_id,
                task_id=self.request.id,
            )
            raise
