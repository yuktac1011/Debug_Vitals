"""
One-shot script to create all database tables.
Run from the backend/ directory with the venv active:
    python create_tables.py
"""
import asyncio
import sys

sys.path.insert(0, ".")

from app.config.database_config import get_engine
from app.models import Base  # noqa: F401 — imports all models so metadata is populated


async def create_tables() -> None:
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    print("All tables created successfully.")


if __name__ == "__main__":
    asyncio.run(create_tables())
