"""
Diagnosis repository — all database access for the diagnosis feature.
"""

import uuid
from typing import List, Optional, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.diagnosis import Diagnosis


class DiagnosisRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, diagnosis: Diagnosis) -> Diagnosis:
        self._session.add(diagnosis)
        await self._session.flush()
        return diagnosis

    async def get_by_id(self, diagnosis_id: uuid.UUID) -> Optional[Diagnosis]:
        result = await self._session.execute(
            select(Diagnosis).where(Diagnosis.id == diagnosis_id)
        )
        return result.scalar_one_or_none()

    async def get_by_session(
        self, session_id: uuid.UUID, limit: int = 20
    ) -> Sequence[Diagnosis]:
        result = await self._session.execute(
            select(Diagnosis)
            .where(Diagnosis.session_id == session_id)
            .order_by(Diagnosis.created_at.desc())
            .limit(limit)
        )
        return result.scalars().all()

    async def save(self, diagnosis: Diagnosis) -> Diagnosis:
        """Persist changes to an existing diagnosis object."""
        self._session.add(diagnosis)
        await self._session.flush()
        return diagnosis
