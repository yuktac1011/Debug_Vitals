"""
SQLAlchemy async engine and session factory.
Connection pool settings are driven by config/settings.py.
No business logic lives here — pure infrastructure.
"""

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.config.settings import get_settings

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    """
    Return (or lazily create) the singleton async engine.
    Uses NullPool when running tests to avoid connection leaks.
    """
    global _engine
    if _engine is None:
        settings = get_settings()
        db_url = settings.database_url.get_secret_value()

        # pytest sets ENVIRONMENT=testing; NullPool prevents cross-test leakage
        is_testing = settings.environment not in ("development", "staging", "production")

        _engine = create_async_engine(
            db_url,
            echo=settings.debug,
            pool_size=settings.db_pool_size if not is_testing else 1,
            max_overflow=settings.db_max_overflow if not is_testing else 0,
            pool_timeout=settings.db_pool_timeout,
            pool_pre_ping=True,  # evict stale connections
            poolclass=NullPool if is_testing else None,
        )
    return _engine


def get_async_session_factory() -> async_sessionmaker[AsyncSession]:
    """Return (or lazily create) the singleton session factory."""
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            bind=get_engine(),
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
            class_=AsyncSession,
        )
    return _session_factory


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that yields a scoped database session.
    Rolls back and closes on any exception; commits are the caller's responsibility.
    """
    factory = get_async_session_factory()
    async with factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
