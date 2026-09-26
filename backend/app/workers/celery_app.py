"""
Celery application configuration.

All task configuration is loaded from settings — no hardcoded values.
Key reliability settings:
  - max_retries per task (from settings)
  - acks_late=True: tasks are acknowledged only after completion,
    preventing silent loss if a worker dies mid-task
  - reject_on_worker_lost=True: tasks are re-queued if the worker dies
  - task_track_started=True: enables running state visibility
  - Dead-letter queue via task_queues + task_routes
"""

from celery import Celery
from kombu import Exchange, Queue

from app.config.settings import get_settings


def create_celery_app() -> Celery:
    settings = get_settings()

    app = Celery(
        "debug_vitals",
        broker=settings.celery_broker_url.get_secret_value(),
        backend=settings.celery_result_backend.get_secret_value(),
        include=[
            "app.workers.tasks.reasoning_tasks",
            "app.workers.tasks.verification_tasks",
        ],
    )

    # Dead-letter exchange for failed tasks
    dlx = Exchange("dead_letter", type="direct")
    default_exchange = Exchange("default", type="direct")

    app.conf.update(
        # Serialisation
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        # Timezone
        timezone="UTC",
        enable_utc=True,
        # Reliability settings
        task_acks_late=True,          # ack after completion, not on receipt
        task_reject_on_worker_lost=True,  # re-queue if worker dies
        task_track_started=True,      # expose "running" state
        # Result retention
        result_expires=86400,         # 24 hours
        # Retry limits — prevents infinite retry loops
        task_max_retries=settings.celery_task_max_retries,
        # Queues
        task_queues=(
            Queue(
                "reasoning",
                default_exchange,
                routing_key="reasoning",
                queue_arguments={"x-dead-letter-exchange": "dead_letter"},
            ),
            Queue(
                "verification",
                default_exchange,
                routing_key="verification",
                queue_arguments={"x-dead-letter-exchange": "dead_letter"},
            ),
            Queue(
                "default",
                default_exchange,
                routing_key="default",
            ),
            Queue(
                "dead_letter",
                dlx,
                routing_key="dead_letter",
            ),
        ),
        task_routes={
            "app.workers.tasks.reasoning_tasks.*": {"queue": "reasoning"},
            "app.workers.tasks.verification_tasks.*": {"queue": "verification"},
        },
        task_default_queue="default",
        # Worker settings
        worker_prefetch_multiplier=1,  # fair dispatch — don't prefetch more than one task
        worker_max_tasks_per_child=1000,  # recycle workers to prevent memory leaks
    )

    return app


# Singleton app instance
celery_app = create_celery_app()
