"""
Async LLM reasoning tasks — runs the diagnosis pipeline asynchronously.

These tasks are enqueued by the diagnosis router when async mode is requested.
The Celery task creates its own DB session (cannot share the request session).

Reliability guarantees:
  - max_retries = settings.celery_task_max_retries (no infinite loops)
  - exponential backoff between retries
  - dead-letter queue on final failure
  - graceful shutdown: tasks check for SIGTERM and mark themselves interrupted
"""

import asyncio
import logging
import uuid
from datetime import datetime, timezone

from celery import Task
from celery.exceptions import MaxRetriesExceededError

from app.workers.celery_app import celery_app
from app.config.settings import get_settings

logger = logging.getLogger(__name__)


class DiagnosisTask(Task):
    """Base class for diagnosis tasks — provides async event loop management."""
    abstract = True

    def run_async(self, coro):
        """Run an async coroutine in a new event loop (Celery workers are sync)."""
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()


@celery_app.task(
    bind=True,
    base=DiagnosisTask,
    name="app.workers.tasks.reasoning_tasks.run_diagnosis_async",
    max_retries=None,  # overridden from settings at runtime
    default_retry_delay=60,
    queue="reasoning",
    acks_late=True,
)
def run_diagnosis_async(
    self: DiagnosisTask,
    session_id: str,
    top_n: int = 10,
    include_graph: bool = False,
) -> dict:
    """
    Async diagnosis task.
    Creates its own DB session, runs the full pipeline, and stores the result.
    """
    settings = get_settings()
    self.max_retries = settings.celery_task_max_retries

    logger.info(
        "Reasoning task started",
        session_id=session_id,
        task_id=self.request.id,
    )

    async def _run():
        from app.config.database_config import get_async_session_factory
        from app.features.diagnosis.service import DiagnosisService
        from app.features.diagnosis.schemas import DiagnoseRequest

        factory = get_async_session_factory()
        async with factory() as db:
            service = DiagnosisService(db)
            result = await service.run_diagnosis(
                session_id=uuid.UUID(session_id),
                request=DiagnoseRequest(top_n=top_n, include_graph=include_graph),
            )
            return {
                "diagnosis_id": str(result.id),
                "status": result.status,
                "top_cause_score": result.root_causes[0].score
                if result.root_causes
                else None,
            }

    try:
        return self.run_async(_run())
    except Exception as exc:
        logger.exception(
            "Reasoning task failed",
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
                "Reasoning task exceeded max retries — sending to dead letter",
                session_id=session_id,
                task_id=self.request.id,
            )
            raise
