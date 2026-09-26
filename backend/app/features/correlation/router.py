"""
Correlation router — internal endpoint, not intended for direct client use.
Exposed for debugging and inspection only.
"""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.features.correlation.service import CorrelationService

router = APIRouter(prefix="/internal/correlation", tags=["correlation"])


@router.get(
    "/{session_id}/graph",
    summary="[Internal] Return the raw correlation graph for a session",
    description=(
        "Builds and returns the event correlation graph as a node/edge list. "
        "Intended for debugging and validation only."
    ),
)
async def get_correlation_graph(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    service = CorrelationService(db)
    return await service.build_graph_snapshot(session_id)
